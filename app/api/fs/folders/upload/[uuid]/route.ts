import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { minioClient } from "@/lib/minio";
import { v4 as uuidv4 } from "uuid";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

interface UploadFolderResponse {
  success: boolean;
  error: string | null;
  message?: string;
  filesCount?: number;
  foldersCount?: number;
}

type RouteParams = {
  uuid: string;
};

async function ensureFolderPath(
  pathParts: string[],
  userId: number,
  parentUuid: string | null,
): Promise<string | null> {
  let currentParentUuid = parentUuid;

  for (const folderName of pathParts) {
    if (!folderName || folderName.trim() === "") continue;

    const existingFolder = await db.folder.findFirst({
      where: {
        name: folderName,
        ownerId: userId,
        parentUuid: currentParentUuid,
      },
      select: { uuid: true },
    });

    if (existingFolder) {
      currentParentUuid = existingFolder.uuid;
    } else {
      const folderUuid = uuidv4();
      await db.folder.create({
        data: {
          uuid: folderUuid,
          name: folderName,
          size: 0,
          ownerId: userId,
          parentUuid: currentParentUuid,
        },
      });
      currentParentUuid = folderUuid;
    }
  }

  return currentParentUuid;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<UploadFolderResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { uuid: targetFolderUuidParam } = await context.params;

    let targetFolderUuid: string | null = targetFolderUuidParam;
    if (targetFolderUuid === "home") {
      targetFolderUuid = null;
    }

    if (targetFolderUuid !== null) {
      const folder = await db.folder.findUnique({
        where: {
          uuid: targetFolderUuid,
          ownerId: userId,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: "Target folder not found" },
          { status: 404 },
        );
      }
    }

    const formData = await request.formData();
    const filesMap = new Map<string, { file: File; path: string }>();

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && !key.endsWith("_path")) {
        const index = key.replace("file_", "");
        const pathKey = `file_${index}_path`;
        const pathValue = formData.get(pathKey);

        if (value instanceof File && typeof pathValue === "string") {
          filesMap.set(index, {
            file: value,
            path: pathValue,
          });
        }
      }
    }

    if (filesMap.size === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 },
      );
    }

    let filesCount = 0;
    const createdFolders = new Set<string>();

    for (const { file, path: relativePath } of filesMap.values()) {
      const pathParts = relativePath.split("/").filter((p) => p.trim() !== "");
      const fileName = pathParts.pop();

      if (!fileName) continue;

      let fileFolderUuid = targetFolderUuid;
      if (pathParts.length > 0) {
        fileFolderUuid = await ensureFolderPath(
          pathParts,
          userId,
          targetFolderUuid,
        );
        pathParts.forEach((part) => createdFolders.add(part));
      }

      const fileUuid = uuidv4();
      const buffer = Buffer.from(await file.arrayBuffer());

      await minioClient.putObject(FILES_BUCKET, fileUuid, buffer, file.size, {
        "Content-Type": file.type || "application/octet-stream",
      });

      await db.files.create({
        data: {
          uuid: fileUuid,
          name: fileName,
          type: file.type || "application/octet-stream",
          size: file.size,
          ownerId: userId,
          folderUuid: fileFolderUuid,
          private: true,
        },
      });

      filesCount++;
    }

    const foldersCount = createdFolders.size;

    return NextResponse.json(
      {
        success: true,
        error: null,
        message: `Successfully uploaded ${filesCount} file${filesCount !== 1 ? "s" : ""} and created ${foldersCount} folder${foldersCount !== 1 ? "s" : ""}`,
        filesCount,
        foldersCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Folder upload error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload folder" },
      { status: 500 },
    );
  }
}

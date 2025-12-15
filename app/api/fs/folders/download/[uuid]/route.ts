// app/api/folder/[uuid]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { minioClient } from "@/lib/minio";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { unlink } from "fs/promises";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

type RouteParams = {
  uuid: string;
};

interface FolderItem {
  uuid: string;
  name: string;
  type: "file" | "folder";
  path: string;
  size: number;
  children?: FolderItem[];
}

async function getFolderContents(
  folderUuid: string | null,
  userId: number,
  currentPath: string = "",
): Promise<FolderItem[]> {
  const result: FolderItem[] = [];

  const folders = await db.folder.findMany({
    where: {
      parentUuid: folderUuid,
      ownerId: userId,
    },
    select: {
      uuid: true,
      name: true,
      size: true,
    },
  });

  for (const folder of folders) {
    const folderPath = currentPath
      ? `${currentPath}/${folder.name}`
      : folder.name;
    const folderItem: FolderItem = {
      uuid: folder.uuid,
      name: folder.name,
      type: "folder",
      path: folderPath,
      size: folder.size,
      children: await getFolderContents(folder.uuid, userId, folderPath),
    };
    result.push(folderItem);
  }

  const files = await db.files.findMany({
    where: {
      folderUuid,
      ownerId: userId,
    },
    select: {
      uuid: true,
      name: true,
      size: true,
    },
  });

  for (const file of files) {
    const filePath = currentPath ? `${currentPath}/${file.name}` : file.name;
    const fileItem: FolderItem = {
      uuid: file.uuid,
      name: file.name,
      type: "file",
      path: filePath,
      size: file.size,
    };
    result.push(fileItem);
  }

  return result;
}

async function downloadFileToTemp(
  fileUuid: string,
  tempPath: string,
): Promise<void> {
  try {
    const stream = await minioClient.getObject(FILES_BUCKET, fileUuid);
    const writeStream = createWriteStream(tempPath);

    await pipeline(stream, writeStream);
  } catch (error) {
    console.error(`Failed to download file ${fileUuid}:`, error);
    throw error;
  }
}

async function createArchive(
  contents: FolderItem[],
  userId: number,
  tempDir: string,
): Promise<{ archivePath: string; totalSize: number }> {
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip();

  const processItem = async (item: FolderItem, basePath: string = "") => {
    const itemPath = basePath ? `${basePath}/${item.name}` : item.name;

    if (item.type === "folder") {
      zip.addFile(itemPath + "/", Buffer.alloc(0));

      if (item.children && item.children.length > 0) {
        for (const child of item.children) {
          await processItem(child, itemPath);
        }
      }
    } else {
      const tempFilePath = path.join(tempDir, `temp_${item.uuid}`);

      await downloadFileToTemp(item.uuid, tempFilePath);

      const fileData = await fs.readFile(tempFilePath);
      zip.addFile(itemPath, fileData);

      await unlink(tempFilePath);
    }
  };

  for (const item of contents) {
    await processItem(item);
  }

  const archivePath = path.join(tempDir, "archive.zip");
  zip.writeZip(archivePath);

  const stats = await fs.stat(archivePath);

  return { archivePath, totalSize: stats.size };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { uuid: folderUuidParam } = await context.params;

    let folderUuid: string | null = folderUuidParam;
    let folderName = "files";

    if (folderUuid === "home") {
      folderUuid = null;
      folderName = "home";
    } else {
      const folder = await db.folder.findUnique({
        where: {
          uuid: folderUuid,
          ownerId: userId,
        },
        select: {
          name: true,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: "Folder not found" },
          { status: 404 },
        );
      }

      folderName = folder.name;
    }

    const contents = await getFolderContents(folderUuid, userId);

    if (contents.length === 0) {
      return NextResponse.json(
        { success: false, error: "Folder is empty" },
        { status: 400 },
      );
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "download-"));

    try {
      const { archivePath, totalSize } = await createArchive(
        contents,
        userId,
        tempDir,
      );

      const archiveBuffer = await fs.readFile(archivePath);
      const arrayBuffer = archiveBuffer.buffer.slice(
        archiveBuffer.byteOffset,
        archiveBuffer.byteOffset + archiveBuffer.byteLength,
      );

      await unlink(archivePath);
      await fs.rmdir(tempDir);

      const fileName = encodeURIComponent(`${folderName}.zip`);

      return new NextResponse(arrayBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Length": totalSize.toString(),
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    } catch (error) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}

      throw error;
    }
  } catch (error) {
    console.error("Folder download error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to download folder" },
      { status: 500 },
    );
  }
}

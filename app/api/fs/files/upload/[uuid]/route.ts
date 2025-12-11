import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

interface UploadResponse {
  success: boolean;
  error: string | null;
  uuid?: string;
}

type RouteParams = {
  uuid: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<UploadResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );

    const { uuid: folderUuidParam } = await context.params;

    let folderUuid: string | null = folderUuidParam;
    if (folderUuid === "home") {
      folderUuid = null;
    }

    if (folderUuid !== null) {
      const folder = await db.folder.findUnique({
        where: {
          uuid: folderUuid,
          ownerId: userId,
        },
      });

      if (!folder)
        return NextResponse.json(
          { success: false, error: "Folder not found" },
          { status: 404 },
        );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file)
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );

    const buffer = Buffer.from(await file.arrayBuffer());
    const uuid = uuidv4();

    await minioClient.putObject(FILES_BUCKET, uuid, buffer, file.size, {
      "Content-Type": file.type,
    });

    const newFile = await db.files.create({
      data: {
        folderUuid,
        name: file.name,
        uuid,
        size: file.size,
        type: file.type,
        ownerId: userId,
      },
    });

    return NextResponse.json(
      { success: true, error: null, uuid: newFile.uuid },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

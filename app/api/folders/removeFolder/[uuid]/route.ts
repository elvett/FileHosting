import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";

const FILES_BUCKET = process.env.MINIO_BUCKET_NAME || "files";

interface RouteParams {
  params: {
    uuid: string;
  };
}

interface removeFolderResponse {
  success: boolean;
  message?: string;
  error?: string;
}

async function recursiveDeleteFolderContent(
  folderUuid: string,
  userId: number,
): Promise<void> {
  const childFolders = await db.folder.findMany({
    where: { parentUuid: folderUuid, ownerId: userId },
    select: { uuid: true },
  });

  for (const child of childFolders) {
    await recursiveDeleteFolderContent(child.uuid, userId);
  }

  const files = await db.files.findMany({
    where: { folderUuid, ownerId: userId },
    select: { uuid: true },
  });

  if (files.length > 0) {
    const objectNames = files.map((f) => f.uuid);

    try {
      await minioClient.removeObjects(FILES_BUCKET, objectNames);
    } catch (err) {
      console.error("MinIO delete error:", err);
      throw err;
    }

    await db.files.deleteMany({
      where: { folderUuid, ownerId: userId },
    });
  }

  await db.folder.delete({
    where: { uuid: folderUuid, ownerId: userId },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<removeFolderResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const Params = await params;
    const folderUuid = Params.uuid;

    if (!folderUuid) {
      return NextResponse.json(
        { success: false, error: "No folder uuid provided" },
        { status: 400 },
      );
    }

    const folder = await db.folder.findUnique({
      where: { uuid: folderUuid, ownerId: userId },
      select: { parentUuid: true },
    });

    if (!folder) {
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 },
      );
    }

    await recursiveDeleteFolderContent(folderUuid, userId);

    return NextResponse.json({
      success: true,
      message: "Folder and all contents deleted successfully.",
    });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Error" },
      { status: 500 },
    );
  }
}

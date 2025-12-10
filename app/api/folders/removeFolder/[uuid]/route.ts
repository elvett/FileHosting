import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { minioClient } from "@/lib/minio";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

interface RemoveFolderResponse {
  success: boolean;
  error: string | null;
}

type RouteParams = {
  uuid: string;
};

async function deleteFolderRecursively(
  folderUuid: string,
  userId: number,
): Promise<void> {
  const childFolders = await db.folder.findMany({
    where: { parentUuid: folderUuid, ownerId: userId },
    select: { uuid: true },
  });

  for (const { uuid } of childFolders) {
    await deleteFolderRecursively(uuid, userId);
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
    where: { uuid: folderUuid },
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<RemoveFolderResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );

    const { uuid: folderUuid } = await context.params;

    if (!folderUuid)
      return NextResponse.json(
        { success: false, error: "UUID is required" },
        { status: 400 },
      );

    const folder = await db.folder.findUnique({
      where: { uuid: folderUuid, ownerId: userId },
    });

    if (!folder)
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 },
      );

    await deleteFolderRecursively(folderUuid, userId);

    return NextResponse.json({ success: true, error: null }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to delete folder" },
      { status: 500 },
    );
  }
}

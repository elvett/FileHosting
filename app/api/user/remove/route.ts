import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { minioClient } from "@/lib/minio";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

interface RemoveUserResponse {
  success: boolean;
  error: string | null;
  message?: string;
}

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
): Promise<NextResponse<RemoveUserResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const topLevelFolders = await db.folder.findMany({
      where: { 
        ownerId: userId,
        parentUuid: null,
      },
      select: { uuid: true },
    });

    for (const { uuid } of topLevelFolders) {
      await deleteFolderRecursively(uuid, userId);
    }

    const orphanFiles = await db.files.findMany({
      where: { 
        ownerId: userId,
        folderUuid: null,
      },
      select: { uuid: true },
    });

    if (orphanFiles.length > 0) {
      const objectNames = orphanFiles.map((f) => f.uuid);
      try {
        await minioClient.removeObjects(FILES_BUCKET, objectNames);
      } catch (err) {
        console.error("MinIO delete error:", err);
      }

      await db.files.deleteMany({
        where: { 
          ownerId: userId,
          folderUuid: null,
        },
      });
    }

    await db.user.delete({
      where: { id: userId },
    });

    const response = NextResponse.json(
      { 
        success: true, 
        error: null, 
        message: "User and all associated data deleted successfully" 
      },
      { status: 200 },
    );

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;

  } catch (error) {
    console.error("Error removing user:", error);
    
    if (error instanceof Error && error.message.includes("Record to delete does not exist")) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to remove user account" },
      { status: 500 },
    );
  }
}
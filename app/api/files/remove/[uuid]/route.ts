import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";
import { db } from "@/lib/db";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

interface FileRemoveResponse {
  success: boolean;
  error: string | null;
}

type RouteParams = {
  uuid: string;
};

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<FileRemoveResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;
    if (!userId)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );

    const { uuid } = await context.params;
    if (!uuid)
      return NextResponse.json(
        { success: false, error: "UUID is required" },
        { status: 400 },
      );

    const file = await db.files.findUnique({
      where: { uuid },
      select: { ownerId: true },
    });
    if (!file)
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );
    if (file.ownerId !== userId)
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );

    try {
      await minioClient.removeObject(FILES_BUCKET, uuid);
    } catch {
      console.error("MinIO remove error:");
    }

    await db.files.delete({ where: { uuid } });

    return NextResponse.json({ success: true, error: null }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "File delete failed" },
      { status: 500 },
    );
  }
}

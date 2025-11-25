import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";
import { db } from "@/lib/db";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

export interface FileRemoveResponse {
  error: string | null;
}

interface RouteParams {
  params: Promise<{
    uuid: string;
  }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<FileRemoveResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const Params = await params;
    const fileUuid = Params.uuid;

    if (!fileUuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    const file = await db.files.findUnique({
      where: { uuid: fileUuid },
      select: { ownerId: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.ownerId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    try {
      await minioClient.removeObject(FILES_BUCKET, fileUuid);
    } catch {
      console.error("MinIO remove error:");
    }

    await db.files.delete({
      where: { uuid: fileUuid },
    });

    return NextResponse.json({ error: null }, { status: 200 });
  } catch (error) {
    console.error("File delete error:", error);
    return NextResponse.json({ error: "File delete failed" }, { status: 500 });
  }
}

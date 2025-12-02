import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";
import { db } from "@/lib/db";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";
const EXPIRY_SECONDS = 60 * 5; 

export interface FilePreviewResponse {
  url: string;
}

export interface FileDownloadError {
  error: string;
}

type ApiResponse = FilePreviewResponse | FileDownloadError;

interface RouteParams {
  params: {
    uuid: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const Params = await params
    const fileUuid = Params.uuid;
    if (!fileUuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    const file = await db.files.findUnique({
      where: { uuid: fileUuid },
      select: {
        ownerId: true,
        private: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.private && file.ownerId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const presignedUrl = await minioClient.presignedGetObject(
      FILES_BUCKET, 
      fileUuid,
      EXPIRY_SECONDS
    );

    return NextResponse.json({ url: presignedUrl }, { status: 200 });

  } catch (error) {
    console.error("PREVIEW ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate preview URL" },
      { status: 500 },
    );
  }
}
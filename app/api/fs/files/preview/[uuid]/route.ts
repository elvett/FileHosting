import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";
import { db } from "@/lib/db";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";
const EXPIRY_SECONDS = 60 * 5;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "video/mp4",
  "audio/mpeg",
];

interface FilePreviewResponse {
  success: boolean;
  url: string;
}

interface FileDownloadError {
  success: boolean;
  error: string;
}

type ApiResponse = FilePreviewResponse | FileDownloadError;

type RouteParams = {
  uuid: string;
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<ApiResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { uuid } = await context.params;

    if (!uuid) {
      return NextResponse.json(
        { success: false, error: "UUID is required" },
        { status: 400 },
      );
    }

    const file = await db.files.findUnique({
      where: { uuid },
      select: {
        ownerId: true,
        private: true,
        type: true,
      },
    });

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );
    }

    if (file.private && file.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );
    }

    const fileMimeType = file.type?.toLowerCase();

    if (!fileMimeType || !ALLOWED_MIME_TYPES.includes(fileMimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Preview is not available for this file type: ${fileMimeType}`,
        },
        { status: 400 },
      );
    }

    const presignedUrl = await minioClient.presignedGetObject(
      FILES_BUCKET,
      uuid,
      EXPIRY_SECONDS,
    );

    return NextResponse.json(
      { success: true, url: presignedUrl },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Failed to generate preview URL" },
      { status: 500 },
    );
  }
}

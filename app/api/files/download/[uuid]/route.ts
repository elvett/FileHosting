import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";
import { db } from "@/lib/db";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

export interface FileDownloadError {
  error: string;
}

type ApiResponse = FileDownloadError;

interface RouteParams {
  params: {
    uuid: string;
  };
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse> | NextResponse> {
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
      select: {
        name: true,
        ownerId: true,
        privacy: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.privacy && file.ownerId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const stream = await minioClient.getObject(FILES_BUCKET, fileUuid);

    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }

    const data = new Uint8Array(Buffer.concat(chunks));

    const fileName = encodeURIComponent(file.name);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("DOWNLOAD ERROR:", error);
    return NextResponse.json({ error: "File download failed" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { minioClient } from "@/lib/minio";
import { db } from "@/lib/db";

const FILES_BUCKET = process.env.FILES_BUCKET || "files";

interface FileDownloadResponse {
  error: string | null;
}

type RouteParams = {
  uuid: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<FileDownloadResponse> | NextResponse> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    const { uuid } = await context.params;
    if (!uuid)
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });

    const file = await db.files.findUnique({
      where: { uuid },
      select: {
        name: true,
        ownerId: true,
        private: true,
      },
    });
    if (!file)
      return NextResponse.json({ error: "File not found" }, { status: 404 });

    if (file.private && file.ownerId !== userId)
      return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const stream = await minioClient.getObject(FILES_BUCKET, uuid);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Uint8Array);
    }

    const buffer = Buffer.concat(chunks);
    const fileName = encodeURIComponent(file.name);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "File download failed" },
      { status: 500 },
    );
  }
}

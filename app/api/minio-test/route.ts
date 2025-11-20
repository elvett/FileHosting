import { NextResponse } from "next/server";
import { minioClient } from "@/lib/minio/minio";

export async function GET() {
  try {
    // 1 — проверяем подключение: список бакетов
    const buckets = await minioClient.listBuckets();

    // 2 — проверяем конкретный bucket
    const bucket = process.env.MINIO_BUCKET!;
    const stream = minioClient.listObjects(bucket, "", true);

    const files: string[] = [];
    for await (const obj of stream) {
      files.push(obj.name);
    }

    return NextResponse.json({
      status: "ok",
      buckets,
      bucket,
      files,
    });
  } catch (error) {
    // Уточняем тип как unknown и проверяем
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        status: "error",
        message,
      },
      { status: 500 },
    );
  }
}

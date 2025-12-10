import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { minioClient } from "@/lib/minio";
import { v4 as uuidv4 } from "uuid";
import { getUserFromToken } from "@/lib/auth";

interface RouteParams {
  params: {
    uuid: string;
  };
}

interface UploadResponse {
  message?: string;
  error?: string;
  success: boolean;
}

export async function POST(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<UploadResponse>> {
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
    let folderUuid: string | null = Params.uuid;
    if (folderUuid === "home") {
      folderUuid = null;
    }

    if (folderUuid !== null) {
      const folder = await db.folder.findUnique({
        where: {
          uuid: folderUuid,
          ownerId: userId,
        },
      });

      if (!folder) {
        return NextResponse.json(
          { success: false, error: "Folder not found" },
          { status: 404 },
        );
      }
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueName = uuidv4();
    const FILESBUCKET = process.env.FILESBUCKET;

    if (!FILESBUCKET) {
      console.error("Environment variable FILESBUCKET is not set");
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 },
      );
    }

    await minioClient.putObject(FILESBUCKET, uniqueName, buffer, file.size, {
      "Content-Type": file.type,
    });

    const newFile = await db.files.create({
      data: {
        folderUuid,
        name: file.name,
        uuid: uniqueName,
        size: file.size,
        type: file.type,
        ownerId: userId,
      },
    });

    return NextResponse.json({ success: true, uuid: newFile.uuid });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Error" },
      { status: 500 },
    );
  }
}

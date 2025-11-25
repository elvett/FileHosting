import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type FileEntry = {
  uuid: string
  type: string;
  name: string;
  // extension: string;
  size: number;
  privacy: boolean;
  date: number;
};

interface DataResponse {
  message: string;
  files: FileEntry[];
}

interface ErrorResponse {
  error: string;
}

export async function GET(
  req: NextRequest,
): Promise<NextResponse<DataResponse | ErrorResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await db.files.findMany({
      where: { ownerId: userId },
      select: {
        uuid: true,
        name: true,
        type: true,
        size: true,
        privacy: true,
        createdAt: true,
      },
    });

    const parsedFiles: FileEntry[] = files.map((f) => {
      const name = f.name;

      return {
        uuid: f.uuid,
        type: f.type,
        name,
        // extension,
        size: f.size,
        privacy: f.privacy,
        date: f.createdAt.getTime(),
      };
    });

    return NextResponse.json(
      { message: "Files loaded successfully", files: parsedFiles },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

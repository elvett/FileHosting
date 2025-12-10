import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type FileEntry = {
  uuid: string;
  type: string;
  name: string;
  size: number;
  privacy: boolean;
  date: number;
  folder?: any;
};

type FolderEntry = {
  uuid: string;
  name: string;
  size: number;
  privacy: boolean;
  date: number;
};

type RouteParams = { uuid: string };

interface DataResponse {
  message: string;
  files: FileEntry[];
  folders?: FolderEntry[];
  success: boolean;
}

interface ErrorResponse {
  error: string;
  success: boolean;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<DataResponse | ErrorResponse>> {
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
    const folderUuid = uuid === "home" ? null : uuid;

    const files = await db.files.findMany({
      where: { ownerId: userId, folderUuid },
      select: {
        uuid: true,
        name: true,
        type: true,
        size: true,
        private: true,
        createdAt: true,
        folder: true,
      },
    });

    const folders = await db.folder.findMany({
      where: { ownerId: userId, parentUuid: folderUuid },
      select: {
        uuid: true,
        name: true,
        private: true,
        createdAt: true,
        size: true,
      },
    });

    const parsedFolders: FolderEntry[] = folders.map((f) => ({
      uuid: f.uuid,
      name: f.name,
      size: f.size,
      privacy: f.private,
      date: f.createdAt.getTime(),
    }));

    const parsedFiles: FileEntry[] = files.map((f) => ({
      folder: f.folder,
      uuid: f.uuid,
      type: f.type,
      name: f.name,
      size: f.size,
      privacy: f.private,
      date: f.createdAt.getTime(),
    }));

    return NextResponse.json(
      {
        success: true,
        message: "Files loaded successfully",
        files: parsedFiles,
        folders: parsedFolders,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 },
    );
  }
}

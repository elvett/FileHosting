import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type FileEntry = {
  uuid: string;
  type: string;
  name: string;
  // extension: string;
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

interface RouteParams {
  params: {
    uuid: string;
  };
}

interface DataResponse {
  message: string;
  files: FileEntry[];
  folders?: FolderEntry[];
}

interface ErrorResponse {
  error: string;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<DataResponse | ErrorResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    const Params = await params;
    let folderUuid: string | null = Params.uuid;
    if (folderUuid === "home") {
      folderUuid = null;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await db.files.findMany({
      where: { ownerId: userId, folderUuid: folderUuid },
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
      where: { ownerId: userId, parentUuid: folderUuid},
      select: {
        uuid: true,
        name: true,
        private: true,
        createdAt: true,
        size: true,
      },
    });

    const parsedFolders: FolderEntry[] = folders.map((f) => {
      return {
        uuid: f.uuid,
        name: f.name,
        size: f.size,
        privacy: f.private,
        date: f.createdAt.getTime(),
      };
    });

    const parsedFiles: FileEntry[] = files.map((f) => {
      const name = f.name;

      return {
        folder: f.folder,
        uuid: f.uuid,
        type: f.type,
        name,
        // extension,
        size: f.size,
        privacy: f.private,
        date: f.createdAt.getTime(),
      };
    });

    return NextResponse.json(
      {
        message: "Files loaded successfully",
        files: parsedFiles,
        folders: parsedFolders,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

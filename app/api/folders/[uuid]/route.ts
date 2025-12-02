import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";
import { v4 as uuidv4} from "uuid";

interface RouteParams {
  params: {
    uuid: string;
  };
}

interface FolderRequest {
  name: string;
}

export async function POST(req: NextRequest, { params }: RouteParams)
 {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Params = await params;
    let folderParentUuid: string | null = Params.uuid;
    if (folderParentUuid === "home") {
      folderParentUuid = null;
    }

    const folderName: FolderRequest = await req.json();
    const folderUuid = uuidv4();

    if (!folderName) {
      return NextResponse.json(
        { error: "No folder name provided" },
        { status: 400 },
      );
    }

    const newFolder = await db.folder.create({
      data: {
        uuid: folderUuid,
        size: 0,
        name: folderName.name,
        ownerId: userId,
        parentUuid: folderParentUuid,
      },
    });

    return NextResponse.json({
      status: "ok",
      name: newFolder.name,
      uuid: newFolder.uuid,
      father: folderParentUuid
    });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

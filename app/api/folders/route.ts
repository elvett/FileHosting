import { NextResponse, NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getUserFromToken } from "@/lib/auth";

interface  FolderRequest{
    name: string;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folderName: FolderRequest = await req.json();

    if (!folderName) {
      return NextResponse.json({ error: "No folder name provided" }, { status: 400 });
    }

    const newFolder = await db.folder.create({
        data: {
        name: folderName.name,
        ownerId: userId,
      },
    });

    return NextResponse.json({ status: "ok", name: newFolder.name });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

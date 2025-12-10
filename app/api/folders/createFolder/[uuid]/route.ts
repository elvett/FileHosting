import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface CreateFolderResponse {
  success: boolean;
  error: string | null;
  uuid?: string;
}

type RouteParams = {
  uuid: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<CreateFolderResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );

    const { uuid: parentUuidParam } = await context.params;

    let parentUuid: string | null = parentUuidParam;
    if (parentUuid === "home") {
      parentUuid = null;
    }

    const body = await request.json();
    const folderName = body?.name?.trim();

    if (!folderName)
      return NextResponse.json(
        { success: false, error: "Folder name is required" },
        { status: 400 },
      );

    const uuid = uuidv4();

    await db.folder.create({
      data: {
        uuid,
        name: folderName,
        size: 0,
        ownerId: userId,
        parentUuid,
      },
    });

    return NextResponse.json(
      { success: true, error: null, uuid },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

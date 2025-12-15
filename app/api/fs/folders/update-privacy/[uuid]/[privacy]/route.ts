import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";

interface FolderShareResponse {
  success: boolean;
  error: string | null;
}

type RouteParams = {
  uuid: string;
  privacy: string;
};

async function updateFolderAndContentsPrivacy(
  folderUuid: string,
  isPrivate: boolean,
  userId: number,
): Promise<void> {
  await db.folder.update({
    where: { uuid: folderUuid },
    data: { private: isPrivate },
  });

  await db.files.updateMany({
    where: {
      folderUuid: folderUuid,
      ownerId: userId,
    },
    data: { private: isPrivate },
  });

  const subfolders = await db.folder.findMany({
    where: {
      parentUuid: folderUuid,
      ownerId: userId,
    },
    select: {
      uuid: true,
    },
  });

  for (const subfolder of subfolders) {
    await updateFolderAndContentsPrivacy(subfolder.uuid, isPrivate, userId);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<FolderShareResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId)
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );

    const { uuid, privacy } = await context.params;

    if (!uuid)
      return NextResponse.json(
        { success: false, error: "UUID is required" },
        { status: 400 },
      );

    const isPrivate = privacy !== "1";

    const folder = await db.folder.findUnique({
      where: { uuid },
      select: { ownerId: true },
    });

    if (!folder)
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 },
      );

    if (folder.ownerId !== userId)
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );

    await updateFolderAndContentsPrivacy(uuid, isPrivate, userId);

    return NextResponse.json({ success: true, error: null }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

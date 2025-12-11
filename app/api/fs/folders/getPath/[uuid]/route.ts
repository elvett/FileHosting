import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";

interface GetPathResponse {
  success: boolean;
  error: string | null;
  path: { uuid: string; name: string }[];
}

type RouteParams = {
  uuid: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<GetPathResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId)
      return NextResponse.json(
        { success: false, error: "Unauthorized", path: [] },
        { status: 401 },
      );

    const { uuid: folderUuid } = await context.params;

    const homePath = { uuid: "home", name: "home" } as const;

    if (folderUuid === "home") {
      return NextResponse.json(
        { success: true, error: null, path: [homePath] },
        { status: 200 },
      );
    }

    let current = await db.folder.findFirst({
      where: { uuid: folderUuid, ownerId: userId },
      select: { uuid: true, name: true, parentUuid: true },
    });

    if (!current)
      return NextResponse.json(
        { success: false, error: "Folder not found", path: [] },
        { status: 404 },
      );

    const path: { uuid: string; name: string }[] = [];

    while (current) {
      path.push({ uuid: current.uuid, name: current.name });

      if (!current.parentUuid) break;

      current = await db.folder.findFirst({
        where: { uuid: current.parentUuid, ownerId: userId },
        select: { uuid: true, name: true, parentUuid: true },
      });
    }

    path.push(homePath);
    path.reverse();

    return NextResponse.json(
      { success: true, error: null, path },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error", path: [] },
      { status: 500 },
    );
  }
}

import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";

interface RouteParams {
  params: {
    uuid: string;
  };
}

interface GetPathResponse {
  success: boolean;
  path: { uuid: string; name: string }[];
  error?: string;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<GetPathResponse>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, path: [], error: "Unauthorized" },
        { status: 401 },
      );
    }
    const Params = await params;
    const folderUuid = Params.uuid;
    const homePath: { uuid: string; name: string } = {
      uuid: "home",
      name: "home",
    };

    if (folderUuid === "home") {
      return NextResponse.json({ success: true, path: [homePath] });
    }

    let current = await db.folder.findFirst({
      where: { uuid: folderUuid, ownerId: userId },
      select: { uuid: true, name: true, parentUuid: true },
    });

    if (!current) {
      return NextResponse.json(
        { success: false, path: [], error: "Folder not found" },
        { status: 404 },
      );
    }

    const pathArr: { uuid: string; name: string }[] = [];
    while (current) {
      pathArr.push({ uuid: current.uuid, name: current.name });
      if (!current.parentUuid) break;

      current = await db.folder.findFirst({
        where: { uuid: current.parentUuid, ownerId: userId },
        select: { uuid: true, name: true, parentUuid: true },
      });
    }
    pathArr.push(homePath);
    pathArr.reverse();

    return NextResponse.json({ success: true, path: pathArr });
  } catch (error) {
    console.error("Server Error:", error);
    return NextResponse.json(
      { success: false, path: [], error: "Internal server error" },
      { status: 500 },
    );
  }
}

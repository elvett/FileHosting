import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";

interface FileShareResponse {
  success: boolean;
  error: string | null;
}

type RouteParams = {
  uuid: string;
  privacy: string;
};

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> },
): Promise<NextResponse<FileShareResponse>> {
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

    const file = await db.files.findUnique({
      where: { uuid },
      select: { ownerId: true },
    });

    if (!file)
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 },
      );

    if (file.ownerId !== userId)
      return NextResponse.json(
        { success: false, error: "Access denied" },
        { status: 403 },
      );

    await db.files.update({
      where: { uuid },
      data: { private: isPrivate },
    });

    return NextResponse.json({ success: true, error: null }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

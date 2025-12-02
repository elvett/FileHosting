import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

interface FileShareParams {
  params: {
    uuid: string;
    privacy: string;
  };
}

interface FileShareSuccess {
  message: string;
}

interface FileShareError {
  error: string;
}

export async function POST(
  req: NextRequest,
  { params }: FileShareParams,
): Promise<NextResponse<FileShareSuccess | FileShareError>> {
  try {
    const user = await getUserFromToken();
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Params = await params;
    const fileUuid = Params.uuid;
    const letprivacy = Params.privacy === "1";

    if (!fileUuid) {
      return NextResponse.json({ error: "UUID is required" }, { status: 400 });
    }

    const file = await db.files.findUnique({
      where: { uuid: fileUuid },
      select: { ownerId: true },
    });

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (file.ownerId !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await db.files.update({
      where: { uuid: fileUuid },
      data: { private: letprivacy },
    });

    return NextResponse.json({ message: "File privacy update " + letprivacy });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type NewType = {
  type: string;
  name: string;
  // extension: string;
  size: number;
  privacy: boolean;
  date: number;
};

interface DataResponse {
  message: string;
  files: NewType[];
}

interface ErrorResponse {
  error: string;
}

export async function GET(
  req: NextRequest
): Promise<NextResponse<DataResponse | ErrorResponse>> {
  try {
    const user = await getUserFromToken(req);
    const userId = user?.userId;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const files = await db.files.findMany({
      where: { ownerId: userId },
      select: {
        type: true,      
        size: true,
        privacy: true,
        createdAt: true,
      },
    });

    const parsedFiles = files.map(f => {
      const [type, fullName] = f.type.split("/");
      const parts = fullName?.split(".") || [];
      const name = parts.slice(0, -1).join(".") || fullName;
      // const extension = parts.length > 1 ? parts[parts.length - 1] : "";
      
      return {
        type: type,
        name,
        // extension,
        size: f.size,
        privacy: f.privacy,
        date: f.createdAt.getTime(), 
      };
    });

    return NextResponse.json(
      { message: "Files loaded successfully", files: parsedFiles },
      { status: 200 }
    );

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/auth";

interface UserResponse {
  success: boolean;
  error: string | null;
  user: {
    userId: number;
    uniqName: string;
  } | null;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<UserResponse>> {
  try {
    const user = await getUserFromToken();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid token",
          user: null,
        },
        { status: 401 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        error: null,
        user,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching user data:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        user: null,
      },
      { status: 500 },
    );
  }
}

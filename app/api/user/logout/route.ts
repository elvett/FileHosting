import { NextRequest, NextResponse } from "next/server";

interface LogoutResponse {
  success: boolean;
  error: string | null;
  message?: string;
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<LogoutResponse>> {
  try {
    const response = NextResponse.json(
      {
        success: true,
        error: null,
        message: "Logged out successfully",
      },
      { status: 200 },
    );

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Error during logout:", error);

    const errorResponse = NextResponse.json(
      {
        success: false,
        error: "Error during logout process",
      },
      { status: 500 },
    );

    errorResponse.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return errorResponse;
  }
}

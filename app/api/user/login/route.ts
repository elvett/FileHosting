import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

interface LoginRequest {
  uniqName: string;
  password: string;
}

interface UserFromDB {
  id: number;
  uniqName: string;
  hashPassword: string;
}

interface LoginResponse {
  message: string;
  user: {
    id: number;
    uniqName: string;
  };
}

interface ErrorResponse {
  error: string;
}

export async function POST(
  req: Request,
): Promise<NextResponse<LoginResponse | ErrorResponse>> {
  try {
    const body: LoginRequest = await req.json();
    const { uniqName, password } = body;

    if (!uniqName || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 },
      );
    }

    const existingUser: UserFromDB | null = await db.user.findUnique({
      where: { uniqName },
      select: {
        id: true,
        uniqName: true,
        hashPassword: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.hashPassword,
    );
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not defined in environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 },
      );
    }

    const token = jwt.sign(
      { userId: existingUser.id, uniqName: existingUser.uniqName },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json<LoginResponse>(
      {
        message: "Login successful",
        user: {
          id: existingUser.id,
          uniqName: existingUser.uniqName,
        },
      },
      { status: 200 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

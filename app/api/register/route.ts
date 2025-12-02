import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

interface RegisterRequest {
  uniqName: string;
  password: string;
  name?: string;
  email?: string;
}

interface RegisterResponse {
  message: string;
  userId: number;
}

export async function POST(
  req: NextRequest,
): Promise<NextResponse<RegisterResponse | { error: string }>> {
  try {
    console.log("Register api");

    const body: RegisterRequest = await req.json();
    const { uniqName, password, email } = body;

    if (!uniqName || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { uniqName },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        uniqName,
        hashPassword: hashedPassword,
        email,
      },
    });

    console.log("user created:", user.id);

    return NextResponse.json({
      message: "User created successfully",
      userId: user.id,
    });
  } catch (error) {
    console.error("error in /api/register:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

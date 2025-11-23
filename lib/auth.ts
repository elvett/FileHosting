// src/lib/auth.ts
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import { db } from "@/lib/db";

export interface AuthUser {
  userId: number;
  uniqName: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;

export async function getUserFromToken(
  request: NextRequest
): Promise<AuthUser | null> {
  const token = request.cookies.get("token")?.value;

  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    
    // Optional: double-check user still exists in DB (prevents stale tokens)
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, uniqName: true },
    });

    if (!user) return null;

    return {
      userId: user.id,
      uniqName: user.uniqName,
    };
  } catch (error) {
    return null; // invalid or expired token
  }
}
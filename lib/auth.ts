import jwt from "jsonwebtoken";
import { db } from "@/lib/db";
import { cookies } from "next/headers";

export interface AuthUser {
  userId: number;
  uniqName: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;

export async function getUserFromToken(): Promise<AuthUser | null> {
  const token = (await cookies()).get("token")?.value;

  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;

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
    return null;
  }
}

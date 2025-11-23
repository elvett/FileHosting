import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export interface AuthUser {
  userId: number;
  uniqName: string;
}

export async function getUserFromCookie(): Promise<AuthUser | null> {
  const token = (await cookies()).get("token")?.value;
  if (!token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
  } catch {
    return null;
  }
}

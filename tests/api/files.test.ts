import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


const TEST_JWT_SECRET = "super-secret-test-jwt-1234567890";
const FILES_BUCKET = "test-files-bucket";
const BASE_URL = "http://localhost/api/files/upload";

let currentTestToken: string | undefined = undefined;

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (name: string) => {
      if (name === "token" && currentTestToken) {
        return { value: currentTestToken };
      }
      return undefined;
    },
  }),
}));
function createUploadRequest(endpoint: string, formData: FormData): NextRequest {
  return new NextRequest(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    body: formData,
  });
}


describe("Upload API Integration Flow", () => {
  let POST: any;
  let ownerUser: { id: number; uniqName: string };
  let ownerToken: string;
  let strangerUserId: number;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.FILESBUCKET = FILES_BUCKET;

    const route = await import("@/app/api/files/upload/[uuid]/route");
    POST = route.POST;

    const ownerHash = await bcrypt.hash("test123", 10);
    const strangerHash = await bcrypt.hash("stranger456", 10);

    ownerUser = await db.user.upsert({
      where: { uniqName: "owner_test_user" },
      update: { hashPassword: ownerHash },
      create: { uniqName: "owner_test_user", hashPassword: ownerHash },
      select: { id: true, uniqName: true },
    });

    const stranger = await db.user.upsert({
      where: { uniqName: "stranger_test_user" },
      update: { hashPassword: strangerHash },
      create: { uniqName: "stranger_test_user", hashPassword: strangerHash },
      select: { id: true, uniqName: true },
    });
    strangerUserId = stranger.id;

    ownerToken = jwt.sign({ userId: ownerUser.id }, TEST_JWT_SECRET, { expiresIn: "7d" });
  });

  beforeEach(() => {
    currentTestToken = undefined;
  });

  afterAll(async () => {
    await db.files.deleteMany({
      where: { ownerId: ownerUser.id },
    });
    await db.folder.deleteMany({
      where: { ownerId: ownerUser.id },
    });
  });

  it("should return 401 no token", async () => {
    const formData = new FormData();
    const req = createUploadRequest("home", formData);

    const res = await POST(req, { params: { uuid: "home" } });
    expect(res.status).toBe(401);
  });
});
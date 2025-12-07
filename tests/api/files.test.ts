import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

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

  it("should return 401 when no token is provided", async () => {
    const formData = new FormData();
    const req = createUploadRequest("home", formData);
    const res = await POST(req, { params: { uuid: "home" } });
    expect(res.status).toBe(401);
  });

  it("should return 400 when no file is sent", async () => {
    currentTestToken = ownerToken;
    const formData = new FormData();
    const req = createUploadRequest("home", formData);
    const res = await POST(req, { params: { uuid: "home" } });
    expect(res.status).toBe(400);
  });

  it("should successfully upload a file to the home folder (folderUuid = null)", async () => {
    currentTestToken = ownerToken;

    const content = "Final success — everything is green!";
    const fileName = "final-win.txt";
    const blob = new Blob([content], { type: "text/plain" });

    const formData = new FormData();
    formData.append("file", blob, fileName);

    const req = createUploadRequest("home", formData);
    const res = await POST(req, { params: { uuid: "home" } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");

    const fileUuid = json.uuid;
    expect(fileUuid).toBeDefined();

    const fileInDb = await db.files.findUnique({ where: { uuid: fileUuid } });
    expect(fileInDb).toMatchObject({
      name: fileName,
      size: Buffer.from(content).byteLength,
      type: "text/plain",
      ownerId: ownerUser.id,
      folderUuid: null,
    });
  });

  it("should successfully upload a file to the user's own folder", async () => {
    currentTestToken = ownerToken;

    const folder = await db.folder.create({
      data: {
        uuid: uuidv4(),
        name: "my-folder-for-test",
        ownerId: ownerUser.id,
        parentUuid: null,
        private: false,
        size: 0,
      },
    });

    const formData = new FormData();
    formData.append("file", new Blob(["folder content"]), "folder-file.txt");

    const req = createUploadRequest(folder.uuid, formData);
    const res = await POST(req, { params: { uuid: folder.uuid } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");

    const fileUuid = json.uuid;
    const fileInDb = await db.files.findUnique({ where: { uuid: fileUuid } });
    expect(fileInDb?.folderUuid).toBe(folder.uuid);
  });

  it("should return 404 when trying to upload to someone else's folder", async () => {
    currentTestToken = ownerToken;

    const strangerFolder = await db.folder.create({
      data: {
        uuid: uuidv4(),
        name: "stranger-folder",
        ownerId: strangerUserId,
        parentUuid: null,
        private: false,
        size: 0,
      },
    });

    const formData = new FormData();
    formData.append("file", new Blob(["fake"]), "evil-file.txt");

    const req = createUploadRequest(strangerFolder.uuid, formData);
    const res = await POST(req, { params: { uuid: strangerFolder.uuid } });

    expect(res.status).toBe(404);
  });
});
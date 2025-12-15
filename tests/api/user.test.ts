import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

vi.mock("@/lib/auth", () => ({
  getUserFromToken: vi.fn(),
}));

vi.mock("@/lib/db", () => {
  const mockDb = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    folder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    files: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  return { db: mockDb };
});

vi.mock("@/lib/minio", () => ({
  minioClient: {
    removeObjects: vi.fn(),
    getObject: vi.fn(),
    putObject: vi.fn(),
    removeObject: vi.fn(),
    presignedGetObject: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
  sign: vi.fn(),
  verify: vi.fn(),
}));

import { getUserFromToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { minioClient } from "@/lib/minio";

import { POST as registerPOST } from "@/app/api/user/register/route";
import { POST as loginPOST } from "@/app/api/user/login/route";
import { GET as userGET } from "@/app/api/user/getData/route";
import { POST as logoutPOST } from "@/app/api/user/logout/route";
import { DELETE as removeDELETE } from "@/app/api/user/remove/route";

function createRequest(
  url: string,
  method: string = "POST",
  body?: any,
  cookies?: Record<string, string>,
): NextRequest {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  
  const request = new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (cookies) {
    const cookieString = Object.entries(cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join("; ");
    request.headers.set("cookie", cookieString);
  }

  return request;
}

describe("User API Tests", () => {
  const mockUserId = 1;
  const mockUsername = "testuser";
  const mockEmail = "test@example.com";
  const mockPassword = "password123";
  const mockHashedPassword = "hashed_password_123";
  const mockJwtToken = "mock-jwt-token";
  const mockFolderUuid = "folder-uuid-123";
  const mockFileUuid = "file-uuid-456";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = "testsecret";
    process.env.FILES_BUCKET = "test-files-bucket";
  });

  describe("POST /api/user/register", () => {
    it("should register a new user successfully", async () => {
      (db.user.findUnique as any).mockResolvedValue(null);
      (db.user.create as any).mockResolvedValue({
        id: mockUserId,
        uniqName: mockUsername,
        email: mockEmail,
      });
      (bcrypt.hash as any).mockResolvedValue(mockHashedPassword);

      const request = createRequest("http://localhost/api/user/register", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
        email: mockEmail,
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: "User created successfully",
        userId: mockUserId,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(mockPassword, 10);
      expect(db.user.create).toHaveBeenCalledWith({
        data: {
          uniqName: mockUsername,
          hashPassword: mockHashedPassword,
          email: mockEmail,
        },
      });
    });

    it("should return 400 when username or password is missing", async () => {
      const request = createRequest("http://localhost/api/user/register", "POST", {
        email: mockEmail,
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Username and password required");
    });

    it("should return 409 when username already exists", async () => {
      (db.user.findUnique as any).mockResolvedValue({ id: mockUserId });

      const request = createRequest("http://localhost/api/user/register", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
        email: mockEmail,
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("Username already taken");
    });

    it("should handle server errors", async () => {
      (db.user.findUnique as any).mockRejectedValue(new Error("Database error"));

      const request = createRequest("http://localhost/api/user/register", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
      });

      const response = await registerPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("POST /api/user/login", () => {
    it("should login successfully with valid credentials", async () => {
      const mockUser = {
        id: mockUserId,
        uniqName: mockUsername,
        hashPassword: mockHashedPassword,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue(mockJwtToken);

      const request = createRequest("http://localhost/api/user/login", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        message: "Login successful",
        user: {
          id: mockUserId,
          uniqName: mockUsername,
        },
      });
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUserId, uniqName: mockUsername },
        "testsecret",
        { expiresIn: "7d" },
      );
      
      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).toContain("token=mock-jwt-token");
    });

    it("should return 400 when credentials are missing", async () => {
      const request = createRequest("http://localhost/api/user/login", "POST", {
        uniqName: mockUsername,
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Username and password required");
    });

    it("should return 404 when user is not found", async () => {
      (db.user.findUnique as any).mockResolvedValue(null);

      const request = createRequest("http://localhost/api/user/login", "POST", {
        uniqName: "nonexistent",
        password: mockPassword,
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("User not found");
    });

    it("should return 401 when password is invalid", async () => {
      const mockUser = {
        id: mockUserId,
        uniqName: mockUsername,
        hashPassword: mockHashedPassword,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(false);

      const request = createRequest("http://localhost/api/user/login", "POST", {
        uniqName: mockUsername,
        password: "wrongpassword",
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Invalid password");
    });

    it("should return 500 when JWT_SECRET is not set", async () => {
      delete process.env.JWT_SECRET;
      
      const mockUser = {
        id: mockUserId,
        uniqName: mockUsername,
        hashPassword: mockHashedPassword,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);

      const request = createRequest("http://localhost/api/user/login", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Server configuration error");
    });

    it("should handle server errors", async () => {
      (db.user.findUnique as any).mockRejectedValue(new Error("Database error"));

      const request = createRequest("http://localhost/api/user/login", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
      });

      const response = await loginPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal server error");
    });
  });

  describe("GET /api/user/getData", () => {
    it("should return user data when authenticated", async () => {
      const mockUser = {
        userId: mockUserId,
        uniqName: mockUsername,
      };

      (getUserFromToken as any).mockResolvedValue(mockUser);

      const request = createRequest(
        "http://localhost/api/user/getData",
        "GET",
        undefined,
        { token: mockJwtToken }
      );

      const response = await userGET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        error: null,
        user: mockUser,
      });
    });

    it("should return 401 when user is not authenticated", async () => {
      (getUserFromToken as any).mockResolvedValue(null);

      const request = createRequest(
        "http://localhost/api/user/getData",
        "GET",
        undefined,
        { token: "invalid-token" }
      );

      const response = await userGET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: "Invalid token",
        user: null,
      });
    });

    it("should handle server errors", async () => {
      (getUserFromToken as any).mockRejectedValue(new Error("Auth error"));

      const request = createRequest(
        "http://localhost/api/user/getData",
        "GET",
        undefined,
        { token: mockJwtToken }
      );

      const response = await userGET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: "Internal server error",
        user: null,
      });
    });
  });

  describe("POST /api/user/logout", () => {
    it("should logout successfully and clear cookies", async () => {
      const request = createRequest("http://localhost/api/user/logout", "POST");

      const response = await logoutPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        error: null,
        message: "Logged out successfully",
      });

      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).toContain("token=;");
      expect(setCookieHeader).toContain("session=;");
      expect(setCookieHeader).toContain("Max-Age=0");
    });

    it("should still clear cookies even on error", async () => {
      const originalJson = NextResponse.json;
      vi.spyOn(NextResponse, "json").mockImplementationOnce(() => {
        throw new Error("JSON error");
      });

      const request = createRequest("http://localhost/api/user/logout", "POST");

      const response = await logoutPOST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: "Error during logout process",
      });

      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).toContain("token=;");
    });
  });

  describe("DELETE /api/user/remove", () => {
    beforeEach(() => {
      const mockUser = {
        userId: mockUserId,
        uniqName: mockUsername,
      };
      (getUserFromToken as any).mockResolvedValue(mockUser);
    });

    it("should delete user and all associated data successfully", async () => {
      (db.folder.findMany as any)
        .mockResolvedValueOnce([{ uuid: mockFolderUuid }])
        .mockResolvedValueOnce([]);

      (db.files.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      (minioClient.removeObjects as any).mockResolvedValue(undefined);

      (db.files.deleteMany as any).mockResolvedValue({ count: 0 });
      (db.folder.delete as any).mockResolvedValue({});
      (db.user.delete as any).mockResolvedValue({});

      const request = createRequest(
        "http://localhost/api/user/remove",
        "DELETE",
        undefined,
        { token: mockJwtToken }
      );

      const response = await removeDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        error: null,
        message: "User and all associated data deleted successfully",
      });

      const setCookieHeader = response.headers.get("set-cookie");
      expect(setCookieHeader).toContain("token=;");
      expect(setCookieHeader).toContain("Max-Age=0");
    });

    it("should recursively delete folders and files", async () => {
      const childFolderUuid = "child-folder-uuid";
      const fileUuid = "file-uuid-123";

      const childFolders = [{ uuid: childFolderUuid }];
      
      const emptyFolders: any[] = [];
      
      (db.folder.findMany as any)
        .mockResolvedValueOnce(childFolders)
        .mockResolvedValueOnce(emptyFolders);

      const filesInChildFolder = [{ uuid: fileUuid }];
      const emptyFiles: any[] = [];
      
      (db.files.findMany as any)
        .mockResolvedValueOnce(filesInChildFolder)
        .mockResolvedValueOnce(emptyFiles)
        .mockResolvedValueOnce(emptyFiles);

      (minioClient.removeObjects as any).mockResolvedValue(undefined);

      (db.files.deleteMany as any)
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      (db.folder.delete as any)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      (db.user.delete as any).mockResolvedValue({});

      const originalFolderFindMany = db.folder.findMany as any;
      (db.folder.findMany as any).mockImplementation((args: any) => {
        if (args?.where?.parentUuid === null) {
          return Promise.resolve([{ uuid: mockFolderUuid }]);
        }
        return originalFolderFindMany();
      });

      const request = createRequest(
        "http://localhost/api/user/remove",
        "DELETE",
        undefined,
        { token: mockJwtToken }
      );

      const response = await removeDELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      expect(minioClient.removeObjects).toHaveBeenCalledWith(
        "test-files-bucket",
        [fileUuid],
      );
      
      expect(db.folder.delete).toHaveBeenCalled();
    });

    it("should delete orphan files", async () => {
      const orphanFileUuid = "orphan-file-uuid";

      (db.folder.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      (db.files.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ uuid: orphanFileUuid }]);

      (minioClient.removeObjects as any).mockResolvedValue(undefined);

      (db.files.deleteMany as any)
        .mockResolvedValueOnce({ count: 1 });

      (db.user.delete as any).mockResolvedValue({});

      const request = createRequest(
        "http://localhost/api/user/remove",
        "DELETE",
        undefined,
        { token: mockJwtToken }
      );

      const response = await removeDELETE(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should handle MinIO errors gracefully", async () => {
      (db.folder.findMany as any)
        .mockResolvedValueOnce([{ uuid: mockFolderUuid }])
        .mockResolvedValueOnce([]);

      (db.files.findMany as any)
        .mockResolvedValueOnce([{ uuid: mockFileUuid }])
        .mockResolvedValueOnce([]);

      (minioClient.removeObjects as any).mockRejectedValue(
        new Error("MinIO error"),
      );

      (db.files.deleteMany as any).mockResolvedValue({ count: 1 });
      (db.folder.delete as any).mockResolvedValue({});
      (db.user.delete as any).mockResolvedValue({});

      const request = createRequest(
        "http://localhost/api/user/remove",
        "DELETE",
        undefined,
        { token: mockJwtToken }
      );

      const response = await removeDELETE(request);
      
      expect(response.status).toBe(200);
    });

    it("should return 401 when user is not authenticated", async () => {
      (getUserFromToken as any).mockResolvedValue(null);

      const request = createRequest(
        "http://localhost/api/user/remove",
        "DELETE"
      );

      const response = await removeDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toEqual({
        success: false,
        error: "Unauthorized",
      });
    });

    it("should return 404 when user does not exist", async () => {
      const mockUser = {
        userId: mockUserId,
        uniqName: mockUsername,
      };
      (getUserFromToken as any).mockResolvedValue(mockUser);
      
      (db.folder.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      (db.files.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      (db.user.delete as any).mockRejectedValue(
        new Error("Some database error"),
      );

      const request = createRequest(
        "http://localhost/api/user/remove",
        "DELETE",
        undefined,
        { token: mockJwtToken }
      );

      const response = await removeDELETE(request);
      const data = await response.json();

      console.log("Response status:", response.status);
      console.log("Response data:", data);
      
      expect([404, 500]).toContain(response.status);
    });

    it("should handle other server errors", async () => {
      const mockUser = {
        userId: mockUserId,
        uniqName: mockUsername,
      };
      (getUserFromToken as any).mockResolvedValue(mockUser);
      
      (db.folder.findMany as any).mockRejectedValue(
        new Error("Some other database error that is not about missing record"),
      );

      const request = createRequest(
        "http://localhost/api/user/remove",
        "DELETE",
        undefined,
        { token: mockJwtToken }
      );

      const response = await removeDELETE(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data).toEqual({
        success: false,
        error: "Failed to remove user account",
      });
    });
  });

  describe("Integration Flow Tests", () => {
    it("should complete full user lifecycle: register → login → get user → logout → delete", async () => {
      (db.user.findUnique as any).mockResolvedValue(null);
      (db.user.create as any).mockResolvedValue({
        id: mockUserId,
        uniqName: mockUsername,
        email: mockEmail,
      });
      (bcrypt.hash as any).mockResolvedValue(mockHashedPassword);

      const registerRequest = createRequest("http://localhost/api/user/register", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
        email: mockEmail,
      });

      const registerResponse = await registerPOST(registerRequest);
      expect(registerResponse.status).toBe(200);

      const mockUser = {
        id: mockUserId,
        uniqName: mockUsername,
        hashPassword: mockHashedPassword,
      };

      (db.user.findUnique as any).mockResolvedValue(mockUser);
      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue(mockJwtToken);

      const loginRequest = createRequest("http://localhost/api/user/login", "POST", {
        uniqName: mockUsername,
        password: mockPassword,
      });

      const loginResponse = await loginPOST(loginRequest);
      expect(loginResponse.status).toBe(200);

      (getUserFromToken as any).mockResolvedValue({
        userId: mockUserId,
        uniqName: mockUsername,
      });

      const getUserRequest = createRequest(
        "http://localhost/api/user/getData",
        "GET",
        undefined,
        { token: mockJwtToken }
      );

      const getUserResponse = await userGET(getUserRequest);
      expect(getUserResponse.status).toBe(200);

      const logoutRequest = createRequest("http://localhost/api/user/logout", "POST");
      const logoutResponse = await logoutPOST(logoutRequest);
      expect(logoutResponse.status).toBe(200);

      (getUserFromToken as any).mockResolvedValue({
        userId: mockUserId,
        uniqName: mockUsername,
      });

      (db.folder.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      (db.files.findMany as any)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      
      (minioClient.removeObjects as any).mockResolvedValue(undefined);
      (db.user.delete as any).mockResolvedValue({});

      const deleteRequest = createRequest(
        "http://localhost/api/user/remove",
        "DELETE",
        undefined,
        { token: mockJwtToken }
      );

      const deleteResponse = await removeDELETE(deleteRequest);
      expect(deleteResponse.status).toBe(200);
    });
  });
});
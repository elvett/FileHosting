import { POST as registerPOST } from "@/app/api/register/route";
import { POST as loginPOST } from "@/app/api/login/route";
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

function createRequest(url: string, data: any): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

describe("Auth Integration Flow", () => {
  beforeEach(async () => {
    await db.user.deleteMany();
  });

  it("should return 200 successfully log in", async () => {
    const username = "new_login_user";
    const password = "secure_password_123";
    const email = "login_test@mail.com";

    const registerRes = await registerPOST(
      createRequest("http://localhost/api/register", {
        uniqName: username,
        password: password,
        email: email,
      }),
    );
    expect(registerRes.status).toBe(200);

    const loginRes = await loginPOST(
      createRequest("http://localhost/api/login", {
        uniqName: username,
        password: password,
      }),
    );

    expect(loginRes.status).toBe(200);
    const body = await loginRes.json();

    expect(body.user).toBeDefined();
    expect(body.user.id).toBeDefined();
  });

  it("should return 401 fail login password is wrong", async () => {
    await registerPOST(
      createRequest("http://localhost/api/register", {
        uniqName: "fail_test",
        password: "correct_password",
        email: "fail@mail.com",
      }),
    );

    const loginRes = await loginPOST(
      createRequest("http://localhost/api/login", {
        uniqName: "fail_test",
        password: "wrong_password",
      }),
    );

    expect(loginRes.status).toBe(401);
    const body = await loginRes.json();
    expect(body.error).toBe("Invalid password");
  });
});

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import jwt from "jsonwebtoken";

interface UserPayload {
  userId: number;
  uniqName: string;
  iat?: number;
  exp?: number;
}

export default async function Home() {
  const cookieStore = cookies();
  const token = (await cookieStore).get("token")?.value;

  if (!token) {
    redirect("/register");
  }

  let user: UserPayload | null = null;

  try {
    const payload = jwt.decode(token) as UserPayload | null;
    if (payload?.userId && payload?.uniqName) {
      user = payload;
    } else {
      redirect("/register");
    }
  } catch (err) {
    console.error("Invalid token:", err);
    redirect("/register");
  }

  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-black text-white min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-4xl font-bold tracking-tight"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-10 h-10 text-sky-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5"
              />
            </svg>
            File Hosting
          </Link>
          <p className="mt-2 text-lg text-gray-400">
            Welcome back,{" "}
            <span className="text-sky-400 font-medium">{user.uniqName}</span>!
          </p>
        </div>

        {/* User Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-purple-600 rounded-full flex items-center justify-center text-2xl font-bold">
              {user.uniqName[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.uniqName}</h2>
              <p className="text-sm text-gray-400">ID: {user.userId}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="mt-2 w-full bg-white/10 rounded-full h-2">
              </div>
            </div>

            <Link
              href="/upload"
              className="block w-full text-center py-3 px-4 bg-gradient-to-r from-sky-500 to-purple-600 text-white font-medium rounded-lg hover:from-sky-600 hover:to-purple-700 transition"
            >
              Upload Files
            </Link>
            <button
              type="submit"
              className="w-full py-3 px-4 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition"
            >
              Log Out
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-gray-500">
          © 2025 File Hosting. All rights reserved.
        </p>
      </div>
    </div>
  );
}

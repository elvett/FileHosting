"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthMode = "login" | "register";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const router = useRouter();

  // Form fields
  const [email, setEmail] = useState("");
  const [uniqName, setUniqName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation
  const [usernameValid, setUsernameValid] = useState(false);
  const [passwordValid, setPasswordValid] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  // Feedback
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUniqName(value);
    setUsernameValid(value.length >= 3);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordValid(value.length >= 6);
    if (mode === "register" && confirmPassword) {
      setPasswordsMatch(value === confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    setConfirmPassword(value);
    setPasswordsMatch(password === value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "register") {
        if (!email.includes("@") || !email.includes(".")) {
          setError("Please enter a valid email");
          setLoading(false);
          return;
        }
        if (!passwordValid || !passwordsMatch || !usernameValid) {
          setError("Please fix the errors above");
          setLoading(false);
          return;
        }
      }

      const endpoint = `/api/${mode}`;
      const body =
        mode === "login"
          ? { uniqName, password }
          : { email, uniqName, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      if (mode === "register") {
        setMessage("Account created! Logging you in...");
        setTimeout(() => {
          setMode("login");
          setEmail("");
          setUniqName("");
          setPassword("");
          setConfirmPassword("");
        }, 1500);
      } else {
        setMessage(`Welcome back, ${data.user.uniqName}!`);
        setTimeout(() => {
          router.push("/");
        }, 1000);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError("Network error – please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-black via-gray-900 to-black text-white min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-3xl font-bold tracking-tight"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-8 h-8 text-sky-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672Zm-7.518-.267A8.25 8.25 0 1 1 20.25 10.5M8.288 14.212A5.25 5.25 0 1 1 17.25 10.5"
              />
            </svg>
            File Hosting
          </Link>
          <p className="mt-2 text-sm text-gray-400">
            Secure cloud storage for your files
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-4 text-sm font-medium transition-all ${mode === "login" ? "text-white bg-white/10 border-b-2 border-sky-400" : "text-gray-400 hover:text-white"}`}
            >
              Log In
            </button>
            <button
              onClick={() => setMode("register")}
              className={`flex-1 py-4 text-sm font-medium transition-all ${mode === "register" ? "text-white bg-white/10 border-b-2 border-sky-400" : "text-gray-400 hover:text-white"}`}
            >
              Sign Up
            </button>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                    placeholder="you@example.com"
                  />
                </div>
              )}

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-300"
                  >
                    Username
                  </label>
                  {usernameValid && (
                    <span className="text-green-400 text-xs">Valid</span>
                  )}
                </div>
                <input
                  id="username"
                  type="text"
                  required
                  value={uniqName}
                  onChange={handleUsernameChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                  placeholder="yourname"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={handlePasswordChange}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                  placeholder="••••••••"
                />
                {password && !passwordValid && (
                  <p className="mt-1 text-xs text-yellow-400">
                    At least 6 characters
                  </p>
                )}
              </div>

              {mode === "register" && (
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium text-gray-300 mb-2"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition"
                    placeholder="••••••••"
                  />
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs text-red-400">
                      Passwords do not match
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p className="text-sm text-red-400 text-center">{error}</p>
              )}
              {message && (
                <p className="text-sm text-green-400 text-center">{message}</p>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  (mode === "register" &&
                    (!passwordValid ||
                      !passwordsMatch ||
                      !usernameValid ||
                      !email.includes("@")))
                }
                className="w-full py-3 px-4 bg-gradient-to-r from-sky-500 to-purple-600 text-white font-medium rounded-lg hover:from-sky-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-gray-900 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? "Please wait..."
                  : mode === "login"
                    ? "Log In"
                    : "Create Account"}
              </button>
            </form>

            {mode === "login" && (
              <p className="mt-6 text-center text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <button
                  onClick={() => setMode("register")}
                  className="text-sky-400 hover:underline font-medium"
                >
                  Sign up
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-500">
          © 2025 File Hosting. All rights reserved.
        </p>
      </div>
    </div>
  );
}

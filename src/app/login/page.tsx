"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rmc-horizontal-white.png"
            alt="RMC - Create With Purpose"
            className="h-9 w-auto"
          />
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8">
          <h1 className="text-[20px] font-semibold text-center">Sign in</h1>
          <p className="text-center text-[13px] text-muted mt-1 mb-7">
            RMC Agency OS
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-muted mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[13px] font-medium text-muted mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                placeholder="••••••••"
              />
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-[13px] text-muted hover:text-accent-strong transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            {error && (
              <div className="bg-danger-bg text-accent-strong text-[13px] p-3 rounded-lg border border-border">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-strong text-white py-2.5 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-[13px] text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent-strong hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

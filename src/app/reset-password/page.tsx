"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // A recovery link may arrive as a token_hash (verified here, in the browser,
  // so email security scanners that pre-fetch the link can't consume the token)
  // or as an already-exchanged session (the code flow via /auth/callback).
  useEffect(() => {
    async function init() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type === "recovery") {
        const { error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: tokenHash,
        });
        setReady(!error);
        setChecking(false);
        if (!error) {
          window.history.replaceState({}, "", "/reset-password");
        }
        return;
      }

      const { data } = await supabase.auth.getUser();
      setReady(!!data.user);
      setChecking(false);
    }
    init();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 1200);
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
          <h1 className="text-[20px] font-semibold text-center mb-7">Set a new password</h1>

          {checking ? (
            <p className="text-center text-[13px] text-faint">Checking your link...</p>
          ) : !ready ? (
            <div className="text-center">
              <div className="bg-danger-bg text-accent-strong text-[13px] p-4 rounded-lg border border-border">
                This reset link is invalid or has expired.
              </div>
              <Link
                href="/forgot-password"
                className="inline-block mt-6 text-[13px] text-accent-strong hover:underline font-medium"
              >
                Request a new link
              </Link>
            </div>
          ) : done ? (
            <div className="bg-good-bg text-good text-[13px] p-4 rounded-lg text-center">
              Password updated. Taking you to your dashboard...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-muted mb-2"
                >
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm"
                  className="block text-[13px] font-medium text-muted mb-2"
                >
                  Confirm new password
                </label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                  placeholder="Re-enter your new password"
                />
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
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

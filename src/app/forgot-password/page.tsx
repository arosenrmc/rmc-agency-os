"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
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
          <h1 className="text-[20px] font-semibold text-center">Reset your password</h1>

          {sent ? (
            <div className="mt-6 text-center">
              <div className="bg-good-bg text-good text-[13px] p-4 rounded-lg">
                If an account exists for <span className="font-medium">{email}</span>,
                a password reset link is on its way. Check your inbox.
              </div>
              <Link
                href="/login"
                className="inline-block mt-6 text-[13px] text-accent-strong hover:underline font-medium"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <p className="text-[13px] text-muted text-center mt-1 mb-7">
                Enter your email and we&apos;ll send you a link to set a new password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-[13px] font-medium text-muted mb-2"
                  >
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
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-muted">
                Remembered it?{" "}
                <Link
                  href="/login"
                  className="text-accent-strong hover:underline font-medium"
                >
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

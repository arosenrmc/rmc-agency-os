import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-page">
      <nav className="px-6 py-4 border-b border-border">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rmc-horizontal-white.png"
            alt="RMC - Create With Purpose"
            className="h-8 w-auto"
          />
          <div className="flex gap-4 items-center">
            <Link
              href="/login"
              className="text-muted hover:text-accent-strong transition-colors px-4 py-2"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="bg-accent hover:bg-accent-strong text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="text-center">
          <h1 className="text-5xl sm:text-6xl font-bold text-ink mb-6">
            Run Your Agency
            <span className="block text-accent-strong">Smarter</span>
          </h1>
          <p className="text-xl text-muted max-w-2xl mx-auto mb-10">
            The all-in-one operating system for modern agencies. Manage clients,
            projects, and team collaboration in one powerful platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-accent hover:bg-accent-strong text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="border border-border text-muted px-8 py-3 rounded-lg text-lg font-medium hover:text-accent-strong hover:border-accent transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>

        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="w-12 h-12 bg-accent-bg rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Client Management</h3>
            <p className="text-muted">
              Keep all your client information organized and accessible in one central location.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="w-12 h-12 bg-accent-bg rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Project Tracking</h3>
            <p className="text-muted">
              Track project progress, deadlines, and deliverables with intuitive tools.
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-6">
            <div className="w-12 h-12 bg-accent-bg rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent-strong" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">Team Collaboration</h3>
            <p className="text-muted">
              Streamline communication and collaboration across your entire team.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-faint">
          <p>&copy; 2024 RMC Agency OS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

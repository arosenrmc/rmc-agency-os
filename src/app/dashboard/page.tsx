import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "./sign-out-button";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });

  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
                RMC Agency OS
              </Link>
              <div className="hidden sm:flex gap-6">
                <Link
                  href="/dashboard"
                  className="text-gray-900 font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/clients"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Clients
                </Link>
                <Link
                  href="/projects"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Projects
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
              <SignOutButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/clients"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {clientCount || 0}
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Clients</h3>
            <p className="text-gray-600 text-sm mt-1">
              Manage your client relationships
            </p>
          </Link>

          <Link
            href="/projects"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900">
                {projectCount || 0}
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Projects</h3>
            <p className="text-gray-600 text-sm mt-1">
              Track project progress and tasks
            </p>
          </Link>

          <div className="bg-white rounded-lg shadow-md p-6 opacity-60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-3xl font-bold text-gray-900">-</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
            <p className="text-gray-600 text-sm mt-1">Coming soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}

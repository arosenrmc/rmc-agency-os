import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ScannerClient from "./scanner-client";
import type { Scan } from "@/lib/types/database";

export default async function ScannerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("user_id", user.id)
    .order("name");

  const { data: recentScans } = await supabase
    .from("scans")
    .select("id, source_label, project_type, security_grade, security_score, source_type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Local folder scanning only works when the server has filesystem access
  // (i.e. running locally, not on Vercel).
  const localScanEnabled = !process.env.VERCEL;

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
                <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Dashboard
                </Link>
                <Link href="/clients" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Clients
                </Link>
                <Link href="/projects" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Projects
                </Link>
                <Link href="/scanner" className="text-gray-900 font-medium">
                  Scanner
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Build Scanner</h1>
          <p className="text-gray-600 mt-1">
            Analyze any website or app you build — stack, architecture, iOS/Android compatibility, and security.
          </p>
        </div>

        <ScannerClient projects={projects || []} localScanEnabled={localScanEnabled} />

        {recentScans && recentScans.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Recent scans</h2>
            <div className="bg-white rounded-lg shadow-md divide-y divide-gray-100">
              {(recentScans as Partial<Scan>[]).map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.source_label}</p>
                    <p className="text-xs text-gray-500">
                      {s.project_type} · {s.source_type} ·{" "}
                      {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 ml-4 text-sm font-semibold px-2.5 py-1 rounded ${
                      (s.security_grade === "A" || s.security_grade === "B")
                        ? "bg-green-100 text-green-700"
                        : s.security_grade === "C"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {s.security_grade ?? "?"} · {s.security_score ?? "?"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

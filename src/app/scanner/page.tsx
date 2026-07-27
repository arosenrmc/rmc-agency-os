import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import AppShell from "@/app/components/app-shell";
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

  const org = await getCurrentOrg();
  if (!org) redirect("/login");

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
    <AppShell org={org} userEmail={user.email ?? ""} active="scanner">
      <div className="mb-6">
        <h1 className="text-[21px] font-semibold tracking-tight">Build Scanner</h1>
        <p className="text-muted text-[13.5px] mt-0.5">
          Analyze any website or app you build — stack, architecture, iOS/Android compatibility, and security.
        </p>
      </div>

      <ScannerClient projects={projects || []} localScanEnabled={localScanEnabled} />

      {recentScans && recentScans.length > 0 && (
        <div className="mt-10">
          <h2 className="text-[15px] font-medium text-ink mb-3">Recent scans</h2>
          <div className="bg-surface border border-border rounded-xl divide-y divide-border">
            {(recentScans as Partial<Scan>[]).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-tile transition-colors">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-ink truncate">{s.source_label}</p>
                  <p className="text-[12px] text-faint">
                    {s.project_type} · {s.source_type} ·{" "}
                    {s.created_at ? new Date(s.created_at).toLocaleString() : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 ml-4 rounded-full text-[11px] font-medium px-2.5 py-1 tabular-nums ${
                    (s.security_grade === "A" || s.security_grade === "B")
                      ? "bg-good-bg text-good"
                      : s.security_grade === "C"
                      ? "bg-warn-bg text-warn"
                      : "bg-danger-bg text-accent-strong"
                  }`}
                >
                  {s.security_grade ?? "?"} · {s.security_score ?? "?"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}

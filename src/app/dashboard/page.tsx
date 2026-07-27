import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentOrg } from "@/lib/org";
import AppShell from "@/app/components/app-shell";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/login");

  const { count: clientCount } = await supabase
    .from("clients")
    .select("*", { count: "exact", head: true });

  const { count: projectCount } = await supabase
    .from("projects")
    .select("*", { count: "exact", head: true });

  const tiles: {
    label: string;
    value: number | null;
    href: string;
    hint: string;
  }[] = [
    { label: "Clients", value: clientCount ?? 0, href: "/clients", hint: "Client relationships" },
    { label: "Active projects", value: projectCount ?? 0, href: "/projects", hint: "Project delivery" },
    { label: "Build Scanner", value: null, href: "/scanner", hint: "Stack & security audit" },
  ];

  return (
    <AppShell org={org} userEmail={user.email ?? ""} active="dashboard">
      <div className="mb-6">
        <h1 className="text-[21px] font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted text-[13.5px] mt-0.5">Welcome back to {org.name}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className="group bg-surface border border-border rounded-xl p-5 transition-colors hover:border-faint"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] text-muted">{t.label}</span>
              <span className="text-accent-strong text-[13px] opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0">
                &rarr;
              </span>
            </div>
            {t.value !== null ? (
              <div className="text-[30px] font-medium tabular-nums leading-none">{t.value}</div>
            ) : (
              <div className="text-[17px] font-medium leading-none py-1.5">Run a scan</div>
            )}
            <div className="text-[12px] text-faint mt-2.5">{t.hint}</div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

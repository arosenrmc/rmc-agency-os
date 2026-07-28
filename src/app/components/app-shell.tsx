import Link from "next/link";
import SignOutButton from "@/app/dashboard/sign-out-button";
import type { CurrentOrg } from "@/lib/org";
import DevFooter from "./dev/dev-footer";

const MODULES = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "loops", label: "Loops", href: "/loops" },
  { id: "clients", label: "Clients", href: "/clients" },
  { id: "projects", label: "Projects", href: "/projects" },
  { id: "domains", label: "Domains", href: "/domains" },
  { id: "scanner", label: "Scanner", href: "/scanner" },
];

type AppShellProps = {
  org: CurrentOrg;
  userEmail: string;
  active: string;
  children: React.ReactNode;
};

export default function AppShell({ org, userEmail, active, children }: AppShellProps) {
  const initials = (org.name.replace(/[^A-Za-z ]/g, "").split(" ").map((w) => w[0]).join("") || "OS")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="h-screen bg-page text-ink flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0">
      <aside className="w-[232px] shrink-0 bg-surface border-r border-border flex flex-col p-4 overflow-y-auto">
        <div className="px-1 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rmc-horizontal-white.png"
            alt="RMC - Create With Purpose"
            className="w-full max-w-[186px] h-auto"
          />
          <div className="text-[10px] tracking-[0.16em] uppercase text-faint mt-2 px-1">
            Agency OS
          </div>
        </div>

        <div className="flex items-center gap-2 bg-tile border border-border rounded-lg px-2.5 py-2 mb-3">
          <span className="w-[22px] h-[22px] rounded-md bg-accent text-white text-[11px] font-medium grid place-items-center">
            {initials}
          </span>
          <span className="flex-1 min-w-0 leading-tight">
            <span className="block text-[13px] font-medium truncate">{org.name}</span>
            <span className="block text-[9.5px] uppercase tracking-wide text-faint">
              {org.role}
            </span>
          </span>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-faint px-2 pb-1.5">
          Modules
        </div>
        <nav className="flex flex-col gap-0.5">
          {MODULES.map((m) => (
            <Link
              key={m.id}
              href={m.href}
              className={`px-2.5 py-2 rounded-lg text-[13.5px] transition-colors ${
                active === m.id
                  ? "bg-accent-bg text-accent-strong font-medium"
                  : "text-muted hover:bg-tile hover:text-ink"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-3 border-t border-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-accent-bg text-accent-strong text-[11px] font-medium grid place-items-center shrink-0">
            {(userEmail[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] truncate text-muted">{userEmail}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-[1080px] mx-auto px-6 py-6">{children}</div>
      </main>
      </div>

      <DevFooter org={org} userEmail={userEmail} />
    </div>
  );
}

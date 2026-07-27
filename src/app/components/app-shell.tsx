import Link from "next/link";
import SignOutButton from "@/app/dashboard/sign-out-button";
import type { CurrentOrg } from "@/lib/org";

const MODULES = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard" },
  { id: "loops", label: "Loops", href: "/loops" },
  { id: "clients", label: "Clients", href: "/clients" },
  { id: "projects", label: "Projects", href: "/projects" },
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
    <div className="min-h-screen bg-[#F5F5F6] text-[#141416] flex">
      <aside className="w-[232px] shrink-0 bg-white border-r border-[#E4E4E6] flex flex-col p-4 sticky top-0 h-screen">
        <div className="px-1 pb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/rmc-horizontal-black.png"
            alt="RMC - Create With Purpose"
            className="w-full max-w-[186px] h-auto"
          />
          <div className="text-[10px] tracking-[0.16em] uppercase text-[#9797A0] mt-2 px-1">
            Agency OS
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#F0F0F1] border border-[#E4E4E6] rounded-lg px-2.5 py-2 mb-3">
          <span className="w-[22px] h-[22px] rounded-md bg-[#EC2024] text-white text-[11px] font-medium grid place-items-center">
            {initials}
          </span>
          <span className="flex-1 min-w-0 leading-tight">
            <span className="block text-[13px] font-medium truncate">{org.name}</span>
            <span className="block text-[9.5px] uppercase tracking-wide text-[#9797A0]">
              {org.role}
            </span>
          </span>
        </div>

        <div className="text-[10px] uppercase tracking-wider text-[#9797A0] px-2 pb-1.5">
          Modules
        </div>
        <nav className="flex flex-col gap-0.5">
          {MODULES.map((m) => (
            <Link
              key={m.id}
              href={m.href}
              className={`px-2.5 py-2 rounded-lg text-[13.5px] transition-colors ${
                active === m.id
                  ? "bg-[#FCE7E7] text-[#C21A1D] font-medium"
                  : "text-[#5C5C63] hover:bg-[#F0F0F1] hover:text-[#141416]"
              }`}
            >
              {m.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto pt-3 border-t border-[#E4E4E6] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[#FCE7E7] text-[#C21A1D] text-[11px] font-medium grid place-items-center shrink-0">
            {(userEmail[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] truncate">{userEmail}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="max-w-[1080px] mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}

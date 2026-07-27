import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import AppShell from "@/app/components/app-shell";
import { Loop } from "@/lib/types/database";
import CaptureBox from "./capture-box";
import TriageBoard from "./triage-board";

export default async function LoopsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/login");

  // Open loops first, freshest capture on top. Done/dropped are fetched too so
  // the board can show a recent "Done" column, but ordered last.
  const { data: loops } = await supabase
    .from("loops")
    .select("*")
    .order("last_touched", { ascending: false });

  const list = (loops as Loop[]) || [];
  const open = list.filter((l) => l.status === "captured" || l.status === "active");

  return (
    <AppShell org={org} userEmail={user.email ?? ""} active="loops">
      <div className="flex justify-between items-end mb-5 gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">Loops</h1>
          <p className="text-[#5C5C63] text-[13.5px] mt-0.5">
            {open.length} open {open.length === 1 ? "loop" : "loops"} in {org.name}.
            Every thread, in one place.
          </p>
        </div>
      </div>

      <CaptureBox orgId={org.id} />
      <TriageBoard loops={list} />
    </AppShell>
  );
}

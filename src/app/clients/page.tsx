import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import AppShell from "@/app/components/app-shell";
import { Client } from "@/lib/types/database";
import ClientList from "./client-list";
import NewClientButton from "./new-client-button";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/login");

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (clients as Client[]) || [];

  return (
    <AppShell org={org} userEmail={user.email ?? ""} active="clients">
      <div className="flex justify-between items-end mb-6 gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">Clients</h1>
          <p className="text-[#5C5C63] text-[13.5px] mt-0.5">
            {list.length} {list.length === 1 ? "account" : "accounts"} in {org.name}.
          </p>
        </div>
        <NewClientButton orgId={org.id} />
      </div>

      <ClientList clients={list} />
    </AppShell>
  );
}

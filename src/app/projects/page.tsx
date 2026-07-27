import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import AppShell from "@/app/components/app-shell";
import ProjectList from "./project-list";
import NewProjectButton from "./new-project-button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getCurrentOrg();
  if (!org) redirect("/login");

  // Fetch projects with client data
  const { data: projects } = await supabase
    .from("projects")
    .select(`
      *,
      clients (
        id,
        name,
        company
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch clients for the dropdown
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, company")
    .eq("user_id", user.id)
    .order("name");

  return (
    <AppShell org={org} userEmail={user.email ?? ""} active="projects">
      <div className="flex justify-between items-end mb-6 gap-3">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">Projects</h1>
          <p className="text-muted text-[13.5px] mt-0.5">
            Manage your client projects and deliverables.
          </p>
        </div>
        <NewProjectButton clients={clients || []} />
      </div>

      <ProjectList projects={projects || []} />
    </AppShell>
  );
}

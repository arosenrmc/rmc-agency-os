import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import AppShell from "@/app/components/app-shell";
import TaskList from "./task-list";
import ProjectHeader from "./project-header";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const org = await getCurrentOrg();
  if (!org) redirect("/login");

  // Fetch project with client data
  const { data: project } = await supabase
    .from("projects")
    .select(`
      *,
      clients (
        id,
        name,
        company,
        email,
        phone
      )
    `)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!project) {
    notFound();
  }

  // Fetch tasks for this project
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", params.id)
    .order("created_at", { ascending: false });

  return (
    <AppShell org={org} userEmail={user.email ?? ""} active="projects">
      <div className="mb-6">
        <Link
          href="/projects"
          className="text-muted hover:text-ink text-[13px] font-medium inline-flex items-center gap-1 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
      </div>

      <ProjectHeader project={project} />

      <div className="mt-8">
        <TaskList projectId={params.id} tasks={tasks || []} />
      </div>
    </AppShell>
  );
}

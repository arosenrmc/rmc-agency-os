import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
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
                  className="text-gray-600 hover:text-gray-900 transition-colors"
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
                  className="text-gray-900 font-medium"
                >
                  Projects
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
          <Link
            href="/projects"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1"
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
      </main>
    </div>
  );
}

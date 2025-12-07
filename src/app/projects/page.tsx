import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import ProjectList from "./project-list";
import NewProjectButton from "./new-project-button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Projects</h1>
            <p className="text-gray-600 mt-1">
              Manage your client projects and deliverables
            </p>
          </div>
          <NewProjectButton clients={clients || []} />
        </div>

        <ProjectList projects={projects || []} />
      </main>
    </div>
  );
}

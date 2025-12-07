import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Client } from "@/lib/types/database";
import ClientList from "./client-list";
import NewClientButton from "./new-client-button";

export default async function ClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
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
                  className="text-gray-900 font-medium"
                >
                  Clients
                </Link>
              </div>
            </div>
            <span className="text-sm text-gray-600">{user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
            <p className="text-gray-600 mt-1">Manage your client relationships</p>
          </div>
          <NewClientButton />
        </div>

        <ClientList clients={(clients as Client[]) || []} />
      </main>
    </div>
  );
}

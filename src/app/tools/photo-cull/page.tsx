import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getCurrentOrg } from "@/lib/org";
import AppShell from "@/app/components/app-shell";
import PhotoCullClientView from "./photo-cull-client";

export const metadata: Metadata = {
  title: "Photo Cull",
  description: "Cull finished edits straight off the NAS.",
};

// The agent lives on the tailnet, so nothing here can be prerendered.
export const dynamic = "force-dynamic";

export default async function PhotoCullPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const org = await getCurrentOrg();
  if (!org) redirect("/login");

  const agentUrl = process.env.NEXT_PUBLIC_PHOTOCULL_AGENT_URL;

  return (
    <AppShell org={org} userEmail={user.email ?? ""} active="photo-cull" fullBleed>
      {agentUrl ? (
        <PhotoCullClientView agentUrl={agentUrl} />
      ) : (
        <div className="p-8 text-sm text-muted">
          <h1 className="mb-2 text-lg font-semibold text-ink">Photo Cull</h1>
          <p>
            <code className="rounded bg-tile px-1.5 py-0.5">
              NEXT_PUBLIC_PHOTOCULL_AGENT_URL
            </code>{" "}
            is not set on this deployment. Add it in Vercel &rarr; Settings &rarr;
            Environment Variables.
          </p>
        </div>
      )}
    </AppShell>
  );
}

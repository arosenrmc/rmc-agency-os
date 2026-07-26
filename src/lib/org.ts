import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/lib/types/database";

export type CurrentOrg = {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
};

/**
 * Resolve the signed-in user's active organization.
 * For now we take their first membership; once org-switching lands this will
 * read the active org from the URL/session instead.
 */
export async function getCurrentOrg(): Promise<CurrentOrg | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("memberships")
    .select("role, organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data || !data.organizations) return null;
  const org = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;
  if (!org) return null;

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    role: data.role as OrgRole,
  };
}

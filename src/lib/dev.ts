import { createClient } from "@/lib/supabase/server";

/**
 * Platform-level check: is the signed-in user a developer/staff of the OS itself
 * (separate from their org role). Gates all dev-only tooling.
 */
export async function isDeveloper(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("is_developer")
    .eq("id", user.id)
    .maybeSingle();

  return !!data?.is_developer;
}

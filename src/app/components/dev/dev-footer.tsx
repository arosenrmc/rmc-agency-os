import { isDeveloper } from "@/lib/dev";
import DevBar from "./dev-bar";
import type { CurrentOrg } from "@/lib/org";

/**
 * Renders the developer footer — but ONLY for users flagged is_developer.
 * For everyone else this returns null (nothing ships to regular users).
 */
export default async function DevFooter({
  org,
  userEmail,
}: {
  org: CurrentOrg;
  userEmail: string;
}) {
  const dev = await isDeveloper();
  if (!dev) return null;

  const version = (process.env.VERCEL_GIT_COMMIT_SHA ?? "").slice(0, 7) || "local";
  const env = process.env.VERCEL_ENV ?? "development";

  return (
    <DevBar
      version={version}
      env={env}
      orgName={org.name}
      role={org.role}
      userEmail={userEmail}
    />
  );
}

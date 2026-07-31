import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";

/**
 * Hands the browser a short-lived credential for the NAS agent.
 *
 * Why a cookie and not a header: the culling UI loads images with <img> tags,
 * and <img> cannot send an Authorization header. A cookie scoped to
 * .rmcmktng.com is sent automatically to cull.rmcmktng.com, so previews,
 * thumbnails, and JSON calls all authenticate the same way.
 *
 * os.rmcmktng.com and cull.rmcmktng.com are the same site (same registrable
 * domain), so SameSite=Lax still sends this on the cross-origin image
 * requests. HttpOnly keeps the token out of reach of any script on the page.
 *
 * The token never reaches the client as a readable value.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_NAME = "pc_token";
const MAX_AGE = 60 * 60 * 8; // 8 hours - one working session

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // A signed-up user with no org membership can't see any module; they
  // shouldn't get a NAS credential either.
  const org = await getCurrentOrg();
  if (!org) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const token = process.env.PHOTOCULL_TOKEN;
  const agentUrl = process.env.NEXT_PUBLIC_PHOTOCULL_AGENT_URL;

  if (!token || !agentUrl) {
    return NextResponse.json(
      { error: "Photo Cull is not configured on this deployment." },
      { status: 500 },
    );
  }

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    domain: ".rmcmktng.com", // shared with cull.rmcmktng.com
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
  });

  return NextResponse.json({ ok: true, agentUrl });
}

export async function DELETE() {
  const jar = await cookies();
  jar.set(COOKIE_NAME, "", { domain: ".rmcmktng.com", path: "/", maxAge: 0 });
  return NextResponse.json({ ok: true });
}

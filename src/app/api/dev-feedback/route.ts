import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDeveloper } from "@/lib/dev";

// agency-os is a CLIENT of the standalone Forge dev backend.
// FORGE_ENDPOINT is the full Forge api URL incl. ?key= (server-only env var).
const FORGE = process.env.FORGE_ENDPOINT;

async function forge(action: string, payload: Record<string, unknown>) {
  if (!FORGE) throw new Error("FORGE_ENDPOINT not configured");
  const res = await fetch(FORGE, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || "Forge error");
  return j;
}

async function requireDev() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!(await isDeveloper()))
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user };
}

export async function POST(req: Request) {
  const { user, error } = await requireDev();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.comment || typeof body.comment !== "string") {
    return NextResponse.json({ error: "comment required" }, { status: 400 });
  }

  try {
    const out = await forge("submit", {
      comment: body.comment,
      route: typeof body.route === "string" ? body.route : null,
      page_url: typeof body.pageUrl === "string" ? body.pageUrl : null,
      screenshotDataUrl:
        typeof body.screenshotDataUrl === "string" ? body.screenshotDataUrl : null,
      submitter_email: user!.email ?? null,
      submitter_user_id: user!.id,
      source_app: "agency-os",
    });
    return NextResponse.json({ ok: true, id: out.ticket?.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { error } = await requireDev();
  if (error) return error;

  const id = new URL(req.url).searchParams.get("id");

  try {
    if (id) {
      const detail = await forge("get", { id });
      return NextResponse.json(detail); // { ticket, events }
    }
    const out = await forge("list", { source_app: "agency-os" });
    const items = (out.items ?? []).map((t: Record<string, unknown>) => ({
      id: t.id,
      comment: t.comment,
      route: t.route,
      page_url: t.page_url,
      status: t.status,
      created_at: t.created_at,
      screenshotUrl: t.screenshotUrl ?? null,
      proposed_solution: t.proposed_solution ?? null,
      resolution: t.resolution ?? null,
    }));
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { error } = await requireDev();
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await forge("update", {
      id: body.id,
      status: body.status,
      proposed_solution: body.proposed_solution,
      resolution: body.resolution,
      actor: "andrew",
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "error" }, { status: 500 });
  }
}

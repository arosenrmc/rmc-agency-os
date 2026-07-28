import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/org";
import { isDeveloper } from "@/lib/dev";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isDeveloper()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const comment: unknown = body?.comment;
  if (!comment || typeof comment !== "string") {
    return NextResponse.json({ error: "comment required" }, { status: 400 });
  }

  const route: string | null = typeof body?.route === "string" ? body.route : null;
  const pageUrl: string | null = typeof body?.pageUrl === "string" ? body.pageUrl : null;
  const screenshotDataUrl: string | null =
    typeof body?.screenshotDataUrl === "string" ? body.screenshotDataUrl : null;

  const org = await getCurrentOrg();

  // Upload screenshot to private storage (best-effort)
  let screenshotPath: string | null = null;
  if (screenshotDataUrl && screenshotDataUrl.startsWith("data:image")) {
    try {
      const base64 = screenshotDataUrl.split(",")[1];
      const bytes = Buffer.from(base64, "base64");
      const path = `${user.id}/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("dev-feedback")
        .upload(path, bytes, { contentType: "image/png", upsert: false });
      if (!upErr) screenshotPath = path;
    } catch {
      // screenshot is optional
    }
  }

  const { data: row, error } = await supabase
    .from("dev_feedback")
    .insert({
      org_id: org?.id ?? null,
      user_id: user.id,
      comment,
      route,
      page_url: pageUrl,
      screenshot_path: screenshotPath,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Mirror to Neptune (best-effort; endpoint + key live in a server env var)
  const neptune = process.env.NEPTUNE_ENDPOINT;
  if (neptune) {
    try {
      await fetch(neptune, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-neptune-author": "agency-os-dev",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: {
            name: "remember",
            arguments: {
              body: `Dev feedback on ${route ?? pageUrl ?? "site"}: ${comment}`,
              context: "agency-os-dev",
              type: "note",
              title: "Dev feedback",
              source: `os.rmcmktng.com ${route ?? ""}`.trim(),
            },
          },
        }),
      });
    } catch {
      // best effort — the dev_feedback row is the source of truth
    }
  }

  return NextResponse.json({ ok: true, id: row.id });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isDeveloper()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { data, error } = await supabase
    .from("dev_feedback")
    .select("id, comment, route, page_url, screenshot_path, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = await Promise.all(
    (data ?? []).map(async (r) => {
      let screenshotUrl: string | null = null;
      if (r.screenshot_path) {
        const { data: signed } = await supabase.storage
          .from("dev-feedback")
          .createSignedUrl(r.screenshot_path, 3600);
        screenshotUrl = signed?.signedUrl ?? null;
      }
      return { ...r, screenshotUrl };
    })
  );

  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!(await isDeveloper()))
    return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const id: unknown = body?.id;
  const status: unknown = body?.status;
  const allowed = ["open", "building", "done", "dismissed"];
  if (typeof id !== "string" || typeof status !== "string" || !allowed.includes(status)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { error } = await supabase.from("dev_feedback").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

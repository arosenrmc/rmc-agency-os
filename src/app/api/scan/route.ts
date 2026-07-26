import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyze } from "@/lib/scanner/engine";
import { fromGithub, fromLocalFolder } from "@/lib/scanner/sources";

// Scanning can fetch many files — give it room and keep it on the Node runtime
// (the local adapter needs the filesystem).
export const runtime = "nodejs";
export const maxDuration = 60;

type ScanRequest = {
  source: "github" | "local";
  value: string;
  projectId?: string | null;
  save?: boolean;
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: ScanRequest;
  try {
    body = (await req.json()) as ScanRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { source, value, projectId, save } = body;
  if (!value?.trim()) {
    return NextResponse.json({ error: "A GitHub URL or folder path is required." }, { status: 400 });
  }

  // Local-folder scanning reads the server's filesystem — only meaningful when
  // running the OS on your own machine. Disable it on the deployed (Vercel)
  // instance so a hosted server can't be pointed at its own files.
  if (source === "local" && process.env.VERCEL) {
    return NextResponse.json(
      { error: "Local folder scanning is only available when running the OS locally, not on the deployed site." },
      { status: 400 }
    );
  }

  try {
    const tree = source === "github" ? await fromGithub(value) : await fromLocalFolder(value);

    if (!tree.files.length) {
      return NextResponse.json({ error: "No files found at that source." }, { status: 400 });
    }

    const report = analyze(tree);

    let scanId: string | null = null;
    if (save) {
      const { data, error } = await supabase
        .from("scans")
        .insert([
          {
            user_id: user.id,
            project_id: projectId || null,
            source_type: source,
            source_label: tree.meta?.label || value,
            project_type: report.projectType,
            security_score: report.security.score,
            security_grade: report.security.grade,
            report,
          },
        ])
        .select("id")
        .single();
      if (error) {
        // Don't fail the whole scan just because persistence failed.
        return NextResponse.json({ report, saved: false, saveError: error.message });
      }
      scanId = data?.id ?? null;
    }

    return NextResponse.json({ report, saved: !!save, scanId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

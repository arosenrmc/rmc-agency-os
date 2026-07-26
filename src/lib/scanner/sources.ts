// Server-only input adapters. Each turns a source (GitHub URL or local
// folder path) into a FileTree the engine can analyze. Node runtime only.

import { promises as fs } from "fs";
import path from "path";
import type { FileTree, ScanFile } from "./types";
import { INTERESTING_FILES } from "./engine";

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".next", ".nuxt", ".svelte-kit", "dist", "build",
  "out", "coverage", "vendor", "Pods", ".vercel", ".turbo", "__pycache__",
  ".venv", "venv", ".idea", ".gradle", "DerivedData", ".dart_tool",
]);

// Source files we're willing to read content from (for secret scanning etc.)
const SCANNABLE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|php|java|kt|swift|dart|env|yml|yaml|json|sql|sh)$/i;
const MAX_FILE_BYTES = 256 * 1024; // don't read files larger than 256KB

const isInteresting = (p: string) => INTERESTING_FILES.has(path.basename(p).toLowerCase());
const isMigration = (p: string) => p.includes("supabase/migrations/") && p.endsWith(".sql");

// Decide whether a file's content should be loaded (vs. path-only listing).
function shouldReadContent(relPath: string, size: number, sampledSoFar: number, cap: number): boolean {
  if (isInteresting(relPath) || isMigration(relPath)) return true; // always
  if (sampledSoFar >= cap) return false;
  if (size > MAX_FILE_BYTES) return false;
  return SCANNABLE_EXT.test(relPath);
}

// ---------------------------------------------------------------------------
// Local folder adapter
// ---------------------------------------------------------------------------

export async function fromLocalFolder(rootPath: string, contentCap = 300): Promise<FileTree> {
  const abs = path.resolve(rootPath);
  const stat = await fs.stat(abs).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error(`Not a directory: ${abs}`);
  }

  const files: ScanFile[] = [];
  let sampled = 0;
  let truncated = false;
  const MAX_TOTAL_FILES = 20000;

  async function walk(dir: string) {
    if (files.length >= MAX_TOTAL_FILES) {
      truncated = true;
      return;
    }
    let entries: import("fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (entry.isFile()) {
        const rel = path.relative(abs, full).split(path.sep).join("/");
        let size = 0;
        try {
          size = (await fs.stat(full)).size;
        } catch {
          /* ignore */
        }
        const file: ScanFile = { path: rel, size };
        if (shouldReadContent(rel, size, sampled, contentCap)) {
          try {
            file.content = await fs.readFile(full, "utf8");
            if (!isInteresting(rel) && !isMigration(rel)) sampled++;
          } catch {
            /* binary or unreadable — leave content undefined */
          }
        }
        files.push(file);
      }
    }
  }

  await walk(abs);
  return { files, meta: { source: "local", label: abs, truncated } };
}

// ---------------------------------------------------------------------------
// GitHub adapter (public repos; optional GITHUB_TOKEN for private/higher limits)
// ---------------------------------------------------------------------------

type ParsedRepo = { owner: string; repo: string; branch?: string };

export function parseGithubUrl(input: string): ParsedRepo {
  const cleaned = input.trim().replace(/\.git$/, "");
  // Accept owner/repo shorthand
  const short = cleaned.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], repo: short[2] };

  let u: URL;
  try {
    u = new URL(cleaned);
  } catch {
    throw new Error("Invalid GitHub URL or owner/repo shorthand.");
  }
  if (!/github\.com$/i.test(u.hostname)) throw new Error("Only github.com URLs are supported.");
  const parts = u.pathname.split("/").filter(Boolean);
  if (parts.length < 2) throw new Error("URL must include owner and repository.");
  const [owner, repo] = parts;
  // .../tree/<branch>/...
  let branch: string | undefined;
  if (parts[2] === "tree" && parts[3]) branch = parts[3];
  return { owner, repo, branch };
}

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "rmc-agency-os-scanner",
  };
  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return h;
}

export async function fromGithub(input: string, contentCap = 60): Promise<FileTree> {
  const { owner, repo, branch: wanted } = parseGithubUrl(input);

  // Resolve default branch if not specified.
  let branch = wanted;
  if (!branch) {
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders() });
    if (metaRes.status === 404) throw new Error("Repository not found (or private without a token).");
    if (metaRes.status === 403) throw new Error("GitHub rate limit hit. Set GITHUB_TOKEN or try again later.");
    if (!metaRes.ok) throw new Error(`GitHub error ${metaRes.status} fetching repo metadata.`);
    const meta = (await metaRes.json()) as { default_branch?: string };
    branch = meta.default_branch || "main";
  }

  // Get the full file tree in one request.
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: ghHeaders() }
  );
  if (!treeRes.ok) throw new Error(`GitHub error ${treeRes.status} fetching file tree.`);
  const treeJson = (await treeRes.json()) as {
    tree: { path: string; type: string; size?: number }[];
    truncated?: boolean;
  };

  const blobs = treeJson.tree.filter(
    (n) => n.type === "blob" && !n.path.split("/").some((seg) => IGNORED_DIRS.has(seg))
  );

  // Decide which files to fetch content for.
  const toRead: string[] = [];
  let sampled = 0;
  for (const b of blobs) {
    if (shouldReadContent(b.path, b.size ?? 0, sampled, contentCap)) {
      toRead.push(b.path);
      if (!isInteresting(b.path) && !isMigration(b.path)) sampled++;
    }
  }

  // Fetch content from raw.githubusercontent.com in parallel (bounded).
  const contentMap = new Map<string, string>();
  const CONCURRENCY = 8;
  for (let i = 0; i < toRead.length; i += CONCURRENCY) {
    const batch = toRead.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (p) => {
        try {
          const raw = await fetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${p.split("/").map(encodeURIComponent).join("/")}`,
            { headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {} }
          );
          if (raw.ok) contentMap.set(p, await raw.text());
        } catch {
          /* skip unreadable */
        }
      })
    );
  }

  const files: ScanFile[] = blobs.map((b) => ({
    path: b.path,
    size: b.size,
    content: contentMap.get(b.path),
  }));

  return {
    files,
    meta: { source: "github", label: `${owner}/${repo}@${branch}`, truncated: treeJson.truncated },
  };
}

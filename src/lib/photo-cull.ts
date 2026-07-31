/**
 * Client for the Photo Cull agent running on the Synology.
 *
 * Every call goes browser -> NAS directly over Tailscale. Nothing here
 * touches Vercel: image bytes never leave your tailnet, and a 400-photo
 * folder costs you nothing in serverless bandwidth.
 *
 * Auth is the httpOnly pc_token cookie set by /api/photo-cull/session,
 * which is why every request uses credentials: "include".
 */

export type CullStatus = "undecided" | "keep" | "reject";

export interface CullItem {
  id: number;
  name: string;
  status: CullStatus;
  raw: boolean;
}

export interface CullState {
  ok: boolean;
  sid: string;
  root: string;
  keep_dir: string;
  reject_dir: string;
  can_undo: boolean;
  items: CullItem[];
}

export interface BrowseResult {
  ok: boolean;
  path: string;
  parent: string | null;
  dirs: { name: string; path: string }[];
  image_count: number;
  sorted_count: number;
  sid: string;
  error?: string;
}

export class AgentUnreachableError extends Error {
  constructor() {
    super("agent-unreachable");
    this.name = "AgentUnreachableError";
  }
}

export class PhotoCullClient {
  constructor(private base: string) {
    this.base = base.replace(/\/$/, "");
  }

  /** URL for an <img> tag. No fetch wrapper - the cookie rides along. */
  imageUrl(kind: "thumb" | "preview" | "full", sid: string, idx: number) {
    return `${this.base}/api/${kind}/${sid}/${idx}`;
  }

  private async call<T>(path: string, init?: RequestInit, timeoutMs = 20000): Promise<T> {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.base}${path}`, {
        ...init,
        credentials: "include",
        signal: ctl.signal,
        headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
      });
      if (res.status === 401) throw new Error("Not authorised for the NAS agent.");
      return (await res.json()) as T;
    } catch (e) {
      // A network-level failure here almost always means "not on the tailnet",
      // not "the NAS is broken". The UI leans on that distinction.
      if (e instanceof TypeError || (e as Error)?.name === "AbortError") {
        throw new AgentUnreachableError();
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Cheap liveness probe. Short timeout so the VPN state resolves fast. */
  health() {
    return this.call<{ ok: boolean; version: string }>("/api/health", {}, 4000);
  }

  roots() {
    return this.call<{ ok: boolean; roots: string[] }>("/api/roots");
  }

  browse(path = "") {
    return this.call<BrowseResult>(`/api/browse?path=${encodeURIComponent(path)}`);
  }

  open(path: string) {
    return this.call<{ ok: boolean; sid: string; count: number; error?: string }>(
      "/api/open",
      { method: "POST", body: JSON.stringify({ path }) },
      60000, // cold NAS + big folder can be slow to enumerate
    );
  }

  state(sid: string) {
    return this.call<CullState>(`/api/state/${sid}`);
  }

  rescan(sid: string) {
    return this.call<{ ok: boolean; count: number }>(`/api/rescan/${sid}`, { method: "POST" });
  }

  decide(sid: string, idx: number, decision: "keep" | "reject") {
    return this.call<{ ok: boolean; can_undo: boolean; error?: string }>("/api/decide", {
      method: "POST",
      body: JSON.stringify({ sid, idx, decision }),
    });
  }

  undo(sid: string) {
    // item carries the restored status — after undoing a keep→reject change
    // it's "keep", not "undecided", so the UI must not assume.
    return this.call<{
      ok: boolean;
      idx: number;
      can_undo: boolean;
      item?: { status: CullStatus };
      error?: string;
    }>("/api/undo", { method: "POST", body: JSON.stringify({ sid }) });
  }
}

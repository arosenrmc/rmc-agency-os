"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AgentUnreachableError,
  PhotoCullClient,
  type BrowseResult,
  type CullItem,
} from "@/lib/photo-cull";

type Phase = "connecting" | "offline" | "error" | "picking" | "culling";

// Translucent washes for the filmstrip overlays. The design tokens are plain
// hex vars, so Tailwind's /opacity modifier can't derive alpha from them.
const GOOD_WASH = "color-mix(in srgb, var(--good) 25%, transparent)";
const DANGER_WASH = "color-mix(in srgb, var(--danger) 25%, transparent)";

/** Breadcrumb trail for a path, rooted at whichever agent root contains it. */
function crumbsFor(path: string, roots: string[]) {
  const root = roots.find((r) => path === r || path.startsWith(r.endsWith("/") ? r : r + "/"));
  if (!root) return [{ name: path || "/", path }];
  const rootName = root.split("/").filter(Boolean).pop() || root;
  const trail = [{ name: rootName, path: root }];
  let acc = root.replace(/\/$/, "");
  for (const seg of path.slice(root.length).split("/").filter(Boolean)) {
    acc += "/" + seg;
    trail.push({ name: seg, path: acc });
  }
  return trail;
}

export default function PhotoCullClientView({ agentUrl }: { agentUrl: string }) {
  const api = useMemo(() => new PhotoCullClient(agentUrl), [agentUrl]);

  const [phase, setPhase] = useState<Phase>("connecting");
  const [errMsg, setErrMsg] = useState("");

  // picker
  const [browse, setBrowse] = useState<BrowseResult | null>(null);
  const [roots, setRoots] = useState<string[]>([]);
  const [rootsView, setRootsView] = useState(false);
  const [pathMode, setPathMode] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [opening, setOpening] = useState(false);

  // culling
  const [sid, setSid] = useState("");
  const [root, setRoot] = useState("");
  const [items, setItems] = useState<CullItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [loadingImg, setLoadingImg] = useState(true);
  const [imgError, setImgError] = useState("");
  const [toast, setToast] = useState("");

  const busy = useRef(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback((m: string) => {
    setToast(m);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1600);
  }, []);

  // ---------------------------------------------------------------- connect
  const connect = useCallback(async () => {
    setPhase("connecting");
    setErrMsg("");
    try {
      // 1. get a cookie for the NAS from our own server
      const res = await fetch("/api/photo-cull/session", { method: "POST" });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setErrMsg(b.error || "Could not start a Photo Cull session.");
        setPhase("error");
        return;
      }
      // 2. can we actually see the NAS from here?
      await api.health();
      const [rt, b] = await Promise.all([api.roots(), api.browse("")]);
      setRoots(rt.roots ?? []);
      setBrowse(b);
      setPathInput(b.path);
      setPhase("picking");
    } catch (e) {
      if (e instanceof AgentUnreachableError) setPhase("offline");
      else {
        setErrMsg((e as Error).message);
        setPhase("error");
      }
    }
  }, [api]);

  useEffect(() => {
    void connect();
  }, [connect]);

  // ---------------------------------------------------------------- picker
  const go = useCallback(
    async (p: string) => {
      try {
        const b = await api.browse(p);
        if (!b.ok) {
          setErrMsg(b.error || "Cannot read that folder.");
          return;
        }
        setErrMsg("");
        setBrowse(b);
        setPathInput(b.path);
        setRootsView(false);
      } catch (e) {
        if (e instanceof AgentUnreachableError) setPhase("offline");
      }
    },
    [api],
  );

  const openFolder = useCallback(async () => {
    if (!browse) return;
    setOpening(true);
    try {
      const r = await api.open(browse.path);
      if (!r.ok) {
        setErrMsg(r.error || "Could not open that folder.");
        return;
      }
      const st = await api.state(r.sid);
      setSid(r.sid);
      setRoot(st.root);
      setItems(st.items);
      setCanUndo(st.can_undo);
      const first = st.items.findIndex((i) => i.status === "undecided");
      setIdx(first < 0 ? Math.max(0, st.items.length - 1) : first);
      setPhase("culling");
    } catch (e) {
      if (e instanceof AgentUnreachableError) setPhase("offline");
    } finally {
      setOpening(false);
    }
  }, [api, browse]);

  // ---------------------------------------------------------------- culling
  const current = items[idx];
  const kept = items.filter((i) => i.status === "keep").length;
  const rejected = items.filter((i) => i.status === "reject").length;
  const left = items.length - kept - rejected;

  const jumpTo = useCallback(
    (n: number) => {
      if (!items.length) return;
      setIdx(Math.max(0, Math.min(n, items.length - 1)));
      setZoom(false);
      setLoadingImg(true);
      setImgError("");
    },
    [items.length],
  );

  const decide = useCallback(
    async (decision: "keep" | "reject") => {
      if (busy.current || !current) return;
      if (current.status === decision) {
        say(decision === "keep" ? "Already in Deliverables" : "Already in Rejected");
        return;
      }
      const wasUndecided = current.status === "undecided";
      busy.current = true;
      try {
        const r = await api.decide(sid, idx, decision);
        if (!r.ok) {
          say(r.error || "Move failed");
          return;
        }
        const next = items.map((it, i) => (i === idx ? { ...it, status: decision } : it));
        setItems(next);
        setCanUndo(true);
        const anyLeft = next.some((i) => i.status === "undecided");
        say(
          !wasUndecided
            ? decision === "keep"
              ? "Moved → Deliverables"
              : "Moved → Rejected"
            : !anyLeft
              ? "All sorted — nothing left to cull"
              : decision === "keep"
                ? "Kept → Deliverables"
                : "Rejected → Rejected",
        );
        // Advance only when culling fresh photos; changing an earlier decision
        // means the user is reviewing, so stay put.
        if (wasUndecided) {
          const nxt = next.findIndex((x, i) => i > idx && x.status === "undecided");
          const fallback = next.findIndex((x) => x.status === "undecided");
          jumpTo(nxt >= 0 ? nxt : fallback >= 0 ? fallback : idx);
        }
      } catch (e) {
        if (e instanceof AgentUnreachableError) setPhase("offline");
      } finally {
        busy.current = false;
      }
    },
    [api, current, idx, items, jumpTo, say, sid],
  );

  const undo = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await api.undo(sid);
      if (!r.ok) {
        say(r.error || "Nothing to undo");
        return;
      }
      const restored = r.item?.status ?? "undecided";
      setItems((prev) =>
        prev.map((it, i) => (i === r.idx ? { ...it, status: restored } : it)),
      );
      setCanUndo(r.can_undo);
      jumpTo(r.idx);
      say(
        restored === "undecided"
          ? "Undone — back in the root folder"
          : restored === "keep"
            ? "Undone — back in Deliverables"
            : "Undone — back in Rejected",
      );
    } catch (e) {
      if (e instanceof AgentUnreachableError) setPhase("offline");
    } finally {
      busy.current = false;
    }
  }, [api, jumpTo, say, sid]);

  // keep the filmstrip following the selection
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [idx]);

  // keyboard
  useEffect(() => {
    if (phase !== "culling") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.tagName === "INPUT" || t?.tagName === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if ((e.metaKey || e.ctrlKey) && k === "z") {
        e.preventDefault();
        void undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") { e.preventDefault(); jumpTo(idx + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); jumpTo(idx - 1); }
      else if (e.key === "ArrowUp" || k === "1" || k === "d") { e.preventDefault(); void decide("keep"); }
      else if (e.key === "ArrowDown" || k === "2" || k === "x") { e.preventDefault(); void decide("reject"); }
      else if (k === "z") { e.preventDefault(); setZoom((z) => !z); }
      else if (k === "u") { e.preventDefault(); void undo(); }
      else if (e.key === " ") {
        e.preventDefault();
        const n = items.findIndex((i) => i.status === "undecided");
        if (n >= 0) jumpTo(n);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, idx, items, jumpTo, phase, undo]);

  // ---------------------------------------------------------------- states
  if (phase === "connecting") {
    return <Centered title="Connecting to the NAS…" body="Checking that the agent is reachable." />;
  }

  if (phase === "offline") {
    return (
      <Centered
        title="Can't reach the NAS"
        body={`Photo Cull talks to ${new URL(agentUrl).hostname} over Tailscale. That address only resolves when you're on the tailnet — connect Tailscale and try again.`}
        action={{ label: "Try again", onClick: () => void connect() }}
      />
    );
  }

  if (phase === "error") {
    return (
      <Centered
        title="Photo Cull is unavailable"
        body={errMsg}
        action={{ label: "Try again", onClick: () => void connect() }}
      />
    );
  }

  // ---------------------------------------------------------------- picker
  if (phase === "picking") {
    const total = (browse?.image_count ?? 0) + (browse?.sorted_count ?? 0);
    const trail = browse ? crumbsFor(browse.path, roots) : [];
    return (
      <div className="flex h-full items-center justify-center overflow-y-auto p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-surface p-6">
          <h1 className="text-lg font-semibold text-ink">Photo Cull</h1>
          <p className="mb-4 mt-1 text-sm text-muted">
            Pick the folder of finished edits. <b className="text-ink">Deliverables</b> and{" "}
            <b className="text-ink">Rejected</b> are created inside it.
          </p>

          <div className="mb-2 flex min-h-8 flex-wrap items-center gap-1 text-sm">
            {roots.length > 1 && (
              <>
                <button
                  onClick={() => setRootsView(true)}
                  className={`rounded px-1.5 py-0.5 hover:bg-tile hover:text-ink ${rootsView ? "font-medium text-ink" : "text-muted"}`}
                >
                  Locations
                </button>
                {!rootsView && <span className="text-faint">/</span>}
              </>
            )}
            {!rootsView &&
              trail.map((c, i) => (
                <span key={c.path} className="flex items-center gap-1">
                  {i > 0 && <span className="text-faint">/</span>}
                  <button
                    onClick={() => void go(c.path)}
                    className={`rounded px-1.5 py-0.5 hover:bg-tile ${
                      i === trail.length - 1 ? "font-medium text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {c.name}
                  </button>
                </span>
              ))}
            <span className="flex-1" />
            <button
              onClick={() => setPathMode((v) => !v)}
              title="Type a path instead"
              className={`rounded border border-border px-2 py-0.5 text-xs hover:text-ink ${pathMode ? "bg-tile text-ink" : "text-faint"}`}
            >
              path
            </button>
          </div>

          {pathMode && (
            <div className="mb-2 flex gap-2">
              <input
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void go(pathInput.trim())}
                spellCheck={false}
                autoFocus
                className="flex-1 rounded-lg border border-border bg-page px-3 py-2 font-mono text-sm text-ink outline-none focus:border-accent"
                placeholder="/photos/JobName"
              />
              <button
                onClick={() => void go(pathInput.trim())}
                className="rounded-lg border border-border bg-tile px-3 text-sm text-muted hover:text-ink"
              >
                Go
              </button>
            </div>
          )}

          <div className="h-72 overflow-auto rounded-lg border border-border bg-page">
            {rootsView ? (
              roots.map((r) => (
                <FolderRow key={r} name={r} onClick={() => void go(r)} />
              ))
            ) : browse?.dirs.length ? (
              browse.dirs.map((d) => (
                <FolderRow key={d.path} name={d.name} onClick={() => void go(d.path)} />
              ))
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-faint">
                No subfolders — this looks like a job folder.
              </div>
            )}
          </div>

          {errMsg && <p className="mt-2 text-sm text-danger">{errMsg}</p>}

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted">
              {browse?.image_count
                ? `${browse.image_count} unsorted${browse.sorted_count ? `, ${browse.sorted_count} already sorted` : ""}`
                : browse?.sorted_count
                  ? `${browse.sorted_count} already sorted, nothing left`
                  : "No images in this folder"}
            </span>
            <button
              disabled={total === 0 || opening || rootsView}
              onClick={() => void openFolder()}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong disabled:bg-tile disabled:text-faint"
            >
              {opening ? "Opening…" : "Cull this folder"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- culling
  const imgSrc = current ? api.imageUrl(zoom ? "full" : "preview", sid, idx) : "";

  return (
    <div className="flex h-full flex-col bg-page text-ink">
      <header className="flex flex-none items-center gap-3 border-b border-border bg-surface px-4 py-2">
        <span className="max-w-[32vw] truncate text-sm font-semibold">{current?.name ?? "—"}</span>
        <span className="whitespace-nowrap text-xs text-faint">
          {items.length ? `${idx + 1} / ${items.length}` : ""}
          {current?.raw ? "  ·  RAW" : ""}
        </span>
        <span className="flex-1" />
        <Pill label="Kept" value={kept} tone="keep" />
        <Pill label="Rejected" value={rejected} tone="reject" />
        <Pill label="Left" value={left} />
        <TBtn disabled={!canUndo} onClick={() => void undo()}>Undo</TBtn>
        <TBtn onClick={() => setZoom((z) => !z)}>{zoom ? "Fit" : "100%"}</TBtn>
        <TBtn onClick={() => { setPhase("picking"); void go(root); }}>Folder</TBtn>
      </header>

      <div
        ref={stageRef}
        onClick={() => setZoom((z) => !z)}
        className={`relative flex flex-1 bg-black ${
          zoom ? "cursor-zoom-out items-start justify-start overflow-auto" : "cursor-zoom-in items-center justify-center overflow-hidden"
        }`}
      >
        {current?.status !== "undecided" && current && (
          <span
            className={`absolute left-4 top-4 z-10 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              current.status === "keep"
                ? "border-good bg-good-bg text-good"
                : "border-danger bg-danger-bg text-danger"
            }`}
          >
            {current.status === "keep" ? "Deliverables" : "Rejected"}
          </span>
        )}

        {loadingImg && !imgError && (
          <span className="absolute text-sm text-faint">Loading…</span>
        )}
        {imgError && (
          <span className="absolute max-w-md text-center text-sm text-danger">{imgError}</span>
        )}
        {!items.length && (
          <div className="absolute max-w-md text-center text-sm text-faint">
            <b className="mb-1 block text-base text-ink">Nothing to cull</b>
            This folder has no images.
          </div>
        )}

        {current && (
          // Served from the NAS over Tailscale; next/image would proxy it
          // through Vercel, which is exactly what we're avoiding.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={imgSrc}
            src={imgSrc}
            alt={current.name}
            onLoad={() => setLoadingImg(false)}
            onError={async () => {
              setLoadingImg(false);
              try {
                const r = await fetch(imgSrc, { credentials: "include" });
                const t = await r.text();
                setImgError(t.length < 300 ? t : "Could not load this image");
              } catch {
                setImgError("Could not load this image");
              }
            }}
            className={
              zoom ? "max-w-none" : "max-h-full max-w-full object-contain"
            }
            style={{ opacity: loadingImg ? 0.25 : 1, transition: "opacity .1s" }}
          />
        )}
      </div>

      <div className="flex flex-none justify-center gap-3 border-t border-border bg-surface p-3">
        <BigBtn tone="reject" disabled={!current || current.status === "reject"} onClick={() => void decide("reject")}>
          Reject <span className="ml-1 text-xs opacity-50">↓</span>
        </BigBtn>
        <BigBtn tone="keep" disabled={!current || current.status === "keep"} onClick={() => void decide("keep")}>
          Keep <span className="ml-1 text-xs opacity-50">↑</span>
        </BigBtn>
      </div>

      <div
        ref={stripRef}
        className="flex flex-none gap-2 overflow-x-auto border-t border-border bg-surface px-3 py-2"
      >
        {items.map((it, i) => (
          <button
            key={it.id}
            data-i={i}
            title={it.name}
            onClick={() => jumpTo(i)}
            className={`relative h-16 flex-none overflow-hidden rounded border-2 bg-tile ${
              i === idx ? "border-ink" : "border-transparent"
            }`}
            style={{ width: 84 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={api.imageUrl("thumb", sid, i)}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover"
              style={{ opacity: i === idx ? 1 : 0.62 }}
            />
            {it.status !== "undecided" && (
              <span
                className={`absolute inset-0 rounded border-2 ${
                  it.status === "keep" ? "border-good" : "border-danger"
                }`}
                style={{ backgroundColor: it.status === "keep" ? GOOD_WASH : DANGER_WASH }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-none flex-wrap justify-center gap-4 border-t border-border bg-page px-4 py-1.5 text-[11px] text-faint">
        <span><Kbd>←</Kbd><Kbd>→</Kbd> navigate</span>
        <span><Kbd>↑</Kbd>/<Kbd>1</Kbd> keep</span>
        <span><Kbd>↓</Kbd>/<Kbd>2</Kbd> reject</span>
        <span><Kbd>Z</Kbd> zoom 100%</span>
        <span><Kbd>U</Kbd> undo</span>
        <span><Kbd>Space</Kbd> next undecided</span>
      </div>

      {toast && (
        <div className="pointer-events-none fixed bottom-52 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-border bg-tile px-4 py-2 text-xs">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ bits */

function FolderRow({ name, onClick }: { name: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 border-b border-border/50 px-3 py-2.5 text-left text-sm text-ink hover:bg-tile"
    >
      <span className="opacity-60">📁</span>
      <span className="flex-1 truncate">{name}</span>
      <span className="text-faint opacity-0 transition-opacity group-hover:opacity-100">›</span>
    </button>
  );
}

function Centered({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-strong"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: number; tone?: "keep" | "reject" }) {
  const c = tone === "keep" ? "text-good" : tone === "reject" ? "text-danger" : "text-ink";
  return (
    <span className="whitespace-nowrap rounded-full border border-border px-3 py-1 text-[11px] text-muted">
      {label} <b className={`font-semibold ${c}`}>{value}</b>
    </span>
  );
}

function TBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:border-faint hover:text-ink disabled:opacity-35 disabled:hover:text-muted"
    >
      {children}
    </button>
  );
}

function BigBtn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  tone: "keep" | "reject";
}) {
  const hover = tone === "keep" ? "hover:bg-good hover:border-good" : "hover:bg-danger hover:border-danger";
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      className={`rounded-xl border border-border bg-tile px-8 py-2.5 text-sm font-semibold ${hover} hover:text-white disabled:opacity-30 disabled:hover:bg-tile`}
    >
      {children}
    </button>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-b-2 border-border bg-tile px-1.5 font-mono text-[10px] text-muted">
      {children}
    </kbd>
  );
}

"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  comment: string;
  route: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
  screenshotUrl: string | null;
};

const STATUSES = [
  { key: "open", label: "Open" },
  { key: "building", label: "Building" },
  { key: "done", label: "Done" },
  { key: "dismissed", label: "Dismissed" },
];

function activeStatusClass(s: string) {
  if (s === "done") return "bg-good-bg text-good";
  if (s === "building") return "bg-warn-bg text-warn";
  if (s === "dismissed") return "bg-tile text-faint";
  return "bg-accent-bg text-accent-strong"; // open
}

export default function DevInbox({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/dev-feedback");
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load");
        if (alive) setItems(j.items ?? []);
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const setStatus = async (id: string, status: string) => {
    setItems((prev) => prev?.map((it) => (it.id === id ? { ...it, status } : it)) ?? null);
    await fetch("/api/dev-feedback", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    }).catch(() => {});
  };

  const openCount = items?.filter((i) => i.status === "open").length ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex justify-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="h-full w-full max-w-md bg-surface border-l border-border flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-[15px] font-semibold">Dev Inbox</h3>
            <p className="text-[11px] text-faint font-mono">
              {openCount} open &middot; {items?.length ?? 0} total
            </p>
          </div>
          <button onClick={onClose} className="text-faint hover:text-ink text-[13px]">
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error ? (
            <div className="p-5 text-[13px] text-accent-strong">{error}</div>
          ) : items === null ? (
            <div className="p-5 text-[13px] text-faint">Loading&hellip;</div>
          ) : items.length === 0 ? (
            <div className="p-5 text-[13px] text-faint">
              No feedback yet. Use &ldquo;+ Annotate&rdquo; to add some.
            </div>
          ) : (
            <ul>
              {items.map((it) => (
                <li key={it.id} className="px-5 py-4 border-b border-border">
                  {it.screenshotUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={it.screenshotUrl}
                      alt="captured region"
                      className="w-full max-h-40 object-contain rounded-lg border border-border bg-tile mb-2.5"
                    />
                  )}
                  <p className="text-[13px] text-ink leading-relaxed">{it.comment}</p>
                  <p className="text-[11px] text-faint font-mono mt-1.5">
                    {it.route ?? it.page_url ?? ""} &middot;{" "}
                    {new Date(it.created_at).toLocaleString()}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {STATUSES.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => setStatus(it.id, s.key)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full transition-colors ${
                          it.status === s.key
                            ? activeStatusClass(s.key)
                            : "text-faint hover:text-ink border border-border"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

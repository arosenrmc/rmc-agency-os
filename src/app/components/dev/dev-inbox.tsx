"use client";

import { useCallback, useEffect, useState } from "react";

type Item = {
  id: string;
  comment: string;
  route: string | null;
  page_url: string | null;
  status: string;
  created_at: string;
  screenshotUrl: string | null;
  proposed_solution?: string | null;
  resolution?: string | null;
};

type TicketFull = Item & {
  submitter_email?: string | null;
  priority?: string | null;
};

type Evt = {
  id: string;
  type: string;
  actor: string | null;
  detail: string | null;
  created_at: string;
};

const STATUSES = [
  { key: "received", label: "Received" },
  { key: "proposed", label: "Proposed" },
  { key: "in_progress", label: "In progress" },
  { key: "fixed", label: "Fixed" },
  { key: "accepted", label: "Accepted" },
  { key: "dismissed", label: "Dismissed" },
];
const ARCHIVED = ["accepted", "dismissed", "closed"];

function statusChip(s: string) {
  if (s === "fixed" || s === "accepted") return "bg-good-bg text-good";
  if (s === "proposed" || s === "in_progress") return "bg-warn-bg text-warn";
  if (s === "dismissed" || s === "closed") return "bg-tile text-faint";
  return "bg-accent-bg text-accent-strong"; // received
}

function fmt(ts: string) {
  return new Date(ts).toLocaleString();
}

export default function DevInbox({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"active" | "archive">("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: TicketFull; events: Evt[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/dev-feedback");
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed to load");
      setItems(j.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const openTicket = useCallback(async (id: string) => {
    setOpenId(id);
    setDetail(null);
    try {
      const res = await fetch(`/api/dev-feedback?id=${id}`);
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      setDetail(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  const patch = async (payload: Record<string, unknown>) => {
    setBusy(true);
    await fetch("/api/dev-feedback", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => {});
    setBusy(false);
    if (openId) await openTicket(openId);
    await loadList();
  };

  const list = (items ?? []).filter((i) =>
    tab === "archive" ? ARCHIVED.includes(i.status) : !ARCHIVED.includes(i.status)
  );
  const activeCount = (items ?? []).filter((i) => !ARCHIVED.includes(i.status)).length;
  const archiveCount = (items ?? []).filter((i) => ARCHIVED.includes(i.status)).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex justify-end"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="h-full w-full max-w-md bg-surface border-l border-border flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold">{openId ? "Ticket" : "Dev Inbox"}</h3>
          <button
            onClick={
              openId
                ? () => {
                    setOpenId(null);
                    setDetail(null);
                  }
                : onClose
            }
            className="text-faint hover:text-ink text-[13px]"
          >
            {openId ? "← Back" : "Close"}
          </button>
        </div>

        {openId ? (
          <div className="flex-1 overflow-y-auto p-5">
            {!detail ? (
              <div className="text-[13px] text-faint">Loading&hellip;</div>
            ) : (
              <TicketDetail detail={detail} busy={busy} onPatch={patch} />
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-1 px-5 pt-3">
              {(["active", "archive"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-[12px] px-3 py-1.5 rounded-lg transition-colors ${
                    tab === t ? "bg-tile text-ink" : "text-faint hover:text-ink"
                  }`}
                >
                  {t === "active" ? `Active (${activeCount})` : `Archive (${archiveCount})`}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto">
              {error ? (
                <div className="p-5 text-[13px] text-accent-strong">{error}</div>
              ) : items === null ? (
                <div className="p-5 text-[13px] text-faint">Loading&hellip;</div>
              ) : list.length === 0 ? (
                <div className="p-5 text-[13px] text-faint">
                  {tab === "archive" ? "No archived tickets." : "No active tickets."}
                </div>
              ) : (
                <ul>
                  {list.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => openTicket(it.id)}
                        className="w-full text-left px-5 py-3.5 border-b border-border hover:bg-tile transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] text-ink leading-snug line-clamp-2">
                            {it.comment}
                          </p>
                          <span
                            className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${statusChip(it.status)}`}
                          >
                            {it.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-faint font-mono mt-1">
                          {it.route ?? ""} &middot; {fmt(it.created_at)}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TicketDetail({
  detail,
  busy,
  onPatch,
}: {
  detail: { ticket: TicketFull; events: Evt[] };
  busy: boolean;
  onPatch: (p: Record<string, unknown>) => void;
}) {
  const t = detail.ticket;
  const [solution, setSolution] = useState(t.proposed_solution ?? "");
  const [resolution, setResolution] = useState(t.resolution ?? "");

  const eventLabel = (e: Evt) => {
    if (e.type === "created") return "Submitted";
    if (e.type === "proposed") return "Proposed solution";
    if (e.type === "fixed") return "Marked fixed";
    if (e.type === "status_change") return "Status change";
    if (e.type === "comment") return "Comment";
    return e.type;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            disabled={busy}
            onClick={() => onPatch({ id: t.id, status: s.key })}
            className={`text-[11px] px-2.5 py-0.5 rounded-full transition-colors ${
              t.status === s.key
                ? statusChip(s.key)
                : "text-faint hover:text-ink border border-border"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <section>
        <div className="text-[10px] uppercase tracking-wider text-faint mb-1.5">
          Original submission
        </div>
        {t.screenshotUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={t.screenshotUrl}
            alt="captured region"
            className="w-full max-h-52 object-contain rounded-lg border border-border bg-tile mb-2"
          />
        )}
        <p className="text-[13px] text-ink leading-relaxed">{t.comment}</p>
        <p className="text-[11px] text-faint font-mono mt-1.5">
          {t.route ?? t.page_url ?? ""} &middot; {t.submitter_email ?? ""} &middot;{" "}
          {fmt(t.created_at)}
        </p>
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-wider text-faint mb-1.5">
          Proposed solution
        </div>
        <textarea
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          placeholder="Proposed fix…"
          className="w-full min-h-[60px] px-3 py-2 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none text-[13px]"
        />
        <button
          disabled={busy}
          onClick={() =>
            onPatch({
              id: t.id,
              proposed_solution: solution,
              status: t.status === "received" ? "proposed" : undefined,
            })
          }
          className="mt-1.5 text-[12px] text-accent-strong hover:text-accent"
        >
          Save proposal
        </button>
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-wider text-faint mb-1.5">
          Final solution
        </div>
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="What was actually done…"
          className="w-full min-h-[50px] px-3 py-2 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none text-[13px]"
        />
        <div className="flex gap-4 mt-1.5">
          <button
            disabled={busy}
            onClick={() => onPatch({ id: t.id, resolution, status: "fixed" })}
            className="text-[12px] text-good"
          >
            Mark fixed
          </button>
          <button
            disabled={busy}
            onClick={() => onPatch({ id: t.id, status: "accepted" })}
            className="text-[12px] text-accent-strong"
          >
            Accept &amp; archive
          </button>
        </div>
      </section>

      <section>
        <div className="text-[10px] uppercase tracking-wider text-faint mb-2">History</div>
        <ul className="space-y-2.5">
          {detail.events.map((e) => (
            <li key={e.id} className="border-l-2 border-border pl-3">
              <div className="text-[12px] text-ink">{eventLabel(e)}</div>
              {e.detail && <div className="text-[12px] text-muted mt-0.5">{e.detail}</div>}
              <div className="text-[10px] text-faint font-mono mt-0.5">
                {e.actor ?? ""} &middot; {fmt(e.created_at)}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

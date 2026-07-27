"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loop } from "@/lib/types/database";

const AGING_DAYS = 5;

const SOURCE_LABELS: Record<Loop["source"], string> = {
  brain: "Brain",
  email: "Email",
  asana: "Asana",
  "ai-chat": "AI chat",
  client: "Client",
  other: "Other",
};

type Column = {
  key: string;
  title: string;
  hint: string;
  match: (l: Loop) => boolean;
};

// The board answers three questions left-to-right: what's raw, what's on me,
// what's stuck with someone else, what's closed.
const COLUMNS: Column[] = [
  {
    key: "inbox",
    title: "Inbox",
    hint: "Untriaged",
    match: (l) => l.status === "captured",
  },
  {
    key: "me",
    title: "On me",
    hint: "My court",
    match: (l) => l.status === "active" && l.waiting_on === "me",
  },
  {
    key: "them",
    title: "Waiting on them",
    hint: "Chase list",
    match: (l) => l.status === "active" && l.waiting_on === "them",
  },
  {
    key: "done",
    title: "Done",
    hint: "Recently closed",
    match: (l) => l.status === "done",
  },
];

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function TriageBoard({ loops }: { loops: Loop[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const update = async (id: string, patch: Partial<Loop>) => {
    setBusyId(id);
    const { error } = await supabase
      .from("loops")
      .update({ ...patch, last_touched: new Date().toISOString() })
      .eq("id", id);
    setBusyId(null);
    if (!error) router.refresh();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const items = loops
          .filter(col.match)
          .slice(0, col.key === "done" ? 15 : undefined);

        return (
          <div key={col.key} className="flex flex-col">
            <div className="flex items-baseline justify-between px-1 pb-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[12.5px] font-semibold">{col.title}</span>
                <span className="text-[10px] uppercase tracking-wider text-[#9797A0]">
                  {col.hint}
                </span>
              </div>
              <span className="text-[11px] text-[#9797A0]">{items.length}</span>
            </div>

            <div className="flex flex-col gap-2 min-h-[80px]">
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#E4E4E6] px-3 py-6 text-center text-[12px] text-[#9797A0]">
                  Nothing here
                </div>
              )}

              {items.map((loop) => {
                const age = daysSince(loop.last_touched);
                const aging = col.key !== "done" && age >= AGING_DAYS;
                const busy = busyId === loop.id;

                return (
                  <div
                    key={loop.id}
                    className={`bg-white rounded-lg border p-3 transition-colors ${
                      aging ? "border-[#EC2024]/40" : "border-[#E4E4E6]"
                    } ${busy ? "opacity-50" : ""}`}
                  >
                    <div
                      className={`text-[13px] leading-snug ${
                        col.key === "done" ? "text-[#9797A0] line-through" : "text-[#141416]"
                      }`}
                    >
                      {loop.title}
                    </div>
                    {loop.note && (
                      <div className="text-[11.5px] text-[#5C5C63] mt-1 line-clamp-2">
                        {loop.note}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[10px] uppercase tracking-wide text-[#9797A0] bg-[#F0F0F1] rounded px-1.5 py-0.5">
                        {SOURCE_LABELS[loop.source]}
                      </span>
                      {aging && (
                        <span className="text-[10px] font-medium text-[#C21A1D] bg-[#FCE7E7] rounded px-1.5 py-0.5">
                          {age}d cold
                        </span>
                      )}
                    </div>

                    {/* Actions vary by which column the loop is in. */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {col.key === "inbox" && (
                        <>
                          <Action label="On me" onClick={() => update(loop.id, { status: "active", waiting_on: "me" })} disabled={busy} />
                          <Action label="On them" onClick={() => update(loop.id, { status: "active", waiting_on: "them" })} disabled={busy} />
                        </>
                      )}
                      {col.key === "me" && (
                        <Action label="→ Them" onClick={() => update(loop.id, { waiting_on: "them" })} disabled={busy} />
                      )}
                      {col.key === "them" && (
                        <Action label="→ Me" onClick={() => update(loop.id, { waiting_on: "me" })} disabled={busy} />
                      )}
                      {col.key === "done" ? (
                        <Action label="Reopen" onClick={() => update(loop.id, { status: "active" })} disabled={busy} />
                      ) : (
                        <>
                          <Action label="Done" primary onClick={() => update(loop.id, { status: "done" })} disabled={busy} />
                          <Action label="Drop" onClick={() => update(loop.id, { status: "dropped" })} disabled={busy} />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Action({
  label,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] font-medium px-2 py-1 rounded-md transition-colors disabled:opacity-40 ${
        primary
          ? "bg-[#EC2024] text-white hover:bg-[#C21A1D]"
          : "bg-[#F0F0F1] text-[#5C5C63] hover:bg-[#E4E4E6] hover:text-[#141416]"
      }`}
    >
      {label}
    </button>
  );
}

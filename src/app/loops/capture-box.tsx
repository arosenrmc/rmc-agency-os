"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/**
 * Always-visible one-line capture. The whole point of Loops is that getting a
 * thought out of your head costs nothing: type it, hit Enter, triage later.
 */
export default function CaptureBox({ orgId }: { orgId: string }) {
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const capture = async () => {
    const text = title.trim();
    if (!text || saving) return;

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in to capture a loop.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("loops").insert({
      title: text,
      user_id: user.id,
      org_id: orgId,
      // Sensible defaults; refine during triage.
      source: "brain",
      waiting_on: "me",
      status: "captured",
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setTitle("");
    setSaving(false);
    router.refresh();
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E4E4E6] px-3 py-2.5 focus-within:border-[#EC2024] focus-within:ring-2 focus-within:ring-[#FCE7E7] transition-colors">
        <svg
          className="w-4 h-4 text-[#9797A0] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") capture();
          }}
          disabled={saving}
          placeholder="Dump anything on your mind — press Enter to capture…"
          className="flex-1 min-w-0 text-[14px] outline-none placeholder:text-[#9797A0] disabled:opacity-60"
          autoFocus
        />
        <button
          onClick={capture}
          disabled={saving || !title.trim()}
          className="bg-[#EC2024] text-white text-[12.5px] font-medium px-3.5 py-1.5 rounded-md hover:bg-[#C21A1D] transition-colors disabled:opacity-40 disabled:hover:bg-[#EC2024]"
        >
          {saving ? "Saving…" : "Capture"}
        </button>
      </div>
      {error && (
        <div className="mt-2 bg-red-50 text-red-600 text-[12.5px] px-3 py-2 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Rect = { left: number; top: number; width: number; height: number };

/**
 * Dev-only annotation tool: drag-select a region -> html2canvas capture ->
 * comment -> POST /api/dev-feedback (which stores it + mirrors to Neptune).
 */
export default function FeedbackTool({
  route,
  onClose,
}: {
  route: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<"select" | "capturing" | "captured">("select");
  const [rect, setRect] = useState<Rect | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<Rect | null>(null);

  const onDown = (e: React.MouseEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
  };
  const onMove = (e: React.MouseEvent) => {
    if (!start.current) return;
    const x0 = start.current.x;
    const y0 = start.current.y;
    setDrag({
      left: Math.min(x0, e.clientX),
      top: Math.min(y0, e.clientY),
      width: Math.abs(e.clientX - x0),
      height: Math.abs(e.clientY - y0),
    });
  };
  const onUp = () => {
    if (drag && drag.width > 8 && drag.height > 8) {
      setRect(drag);
      setPhase("capturing");
    } else {
      start.current = null;
      setDrag(null);
    }
  };

  const doCapture = useCallback(async (r: Rect) => {
    try {
      const html2canvas = (await import("html2canvas")).default;
      const scale = window.devicePixelRatio || 1;
      const full = await html2canvas(document.body, {
        backgroundColor: "#0B0B0C",
        logging: false,
        useCORS: true,
        scale,
      });
      const pageX = (window.scrollX + r.left) * scale;
      const pageY = (window.scrollY + r.top) * scale;
      const w = r.width * scale;
      const h = r.height * scale;
      const crop = document.createElement("canvas");
      crop.width = w;
      crop.height = h;
      const ctx = crop.getContext("2d");
      if (ctx) ctx.drawImage(full, pageX, pageY, w, h, 0, 0, w, h);
      setShot(crop.toDataURL("image/png"));
    } catch {
      setShot(null); // capture failed — allow comment-only
    }
    setPhase("captured");
  }, []);

  useEffect(() => {
    if (phase === "capturing" && rect) {
      // wait a tick so this overlay is unmounted before html2canvas runs
      const t = setTimeout(() => doCapture(rect), 60);
      return () => clearTimeout(t);
    }
  }, [phase, rect, doCapture]);

  const submit = async () => {
    if (!comment.trim()) {
      setError("Add a comment first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dev-feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          comment: comment.trim(),
          route,
          pageUrl: window.location.href,
          screenshotDataUrl: shot,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Failed to save");
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
      setSubmitting(false);
    }
  };

  // While html2canvas runs, render nothing so the overlay isn't in the shot.
  if (phase === "capturing") return null;

  if (phase === "select") {
    return (
      <div
        className="fixed inset-0 z-50 cursor-crosshair"
        style={{ background: "rgba(0,0,0,0.35)" }}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
      >
        <div className="fixed top-3 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-3 py-1.5 text-[12px] text-muted">
          Drag to select a region &middot;{" "}
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-accent-strong"
          >
            cancel
          </button>
        </div>
        {drag && (
          <div
            className="fixed border-2 border-accent pointer-events-none"
            style={{
              left: drag.left,
              top: drag.top,
              width: drag.width,
              height: drag.height,
              background: "rgba(236,32,36,0.12)",
            }}
          />
        )}
      </div>
    );
  }

  // captured
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-surface border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] font-semibold">Dev feedback</h3>
          <span className="text-[11px] text-faint font-mono">{route}</span>
        </div>
        {shot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shot}
            alt="captured region"
            className="w-full max-h-64 object-contain rounded-lg border border-border bg-tile mb-3"
          />
        ) : (
          <div className="text-[12px] text-faint mb-3">
            Screenshot unavailable — logging comment + route only.
          </div>
        )}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What should change here?"
          autoFocus
          className="w-full min-h-[80px] px-3 py-2 bg-tile border border-border rounded-lg text-ink placeholder:text-faint focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors text-[13px]"
        />
        {error && (
          <div className="mt-2 bg-danger-bg text-accent-strong text-[12px] p-2 rounded-lg">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="bg-tile border border-border text-ink hover:border-faint rounded-lg px-4 py-2 text-[13px]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="bg-accent hover:bg-accent-strong text-white rounded-lg px-4 py-2 text-[13px] font-medium disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import FeedbackTool from "./feedback-tool";
import DevInbox from "./dev-inbox";

export default function DevBar({
  version,
  env,
  orgName,
  role,
  userEmail,
}: {
  version: string;
  env: string;
  orgName: string;
  role: string;
  userEmail: string;
}) {
  const pathname = usePathname();
  const [annotating, setAnnotating] = useState(false);
  const [inbox, setInbox] = useState(false);

  const envColor =
    env === "production"
      ? "text-accent-strong"
      : env === "preview"
      ? "text-warn"
      : "text-good";

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 h-8 bg-[#0E0E10] border-t border-border flex items-center gap-4 px-4 text-[11px] text-faint font-mono">
        <span className="text-accent-strong font-semibold tracking-wide">DEV</span>
        <span className={envColor} title="environment">
          {env}
        </span>
        <span title="git commit">v:{version}</span>
        <span className="text-muted" title="active org · your role">
          {orgName} &middot; {role}
        </span>
        <span className="truncate" title="route">
          {pathname}
        </span>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden sm:inline text-faint">{userEmail}</span>
          <button
            onClick={() => setInbox(true)}
            className="text-muted hover:text-ink transition-colors"
          >
            DEV Inbox
          </button>
          <button
            onClick={() => setAnnotating(true)}
            className="text-accent-strong hover:text-accent transition-colors"
          >
            + Annotate
          </button>
        </div>
      </div>

      {annotating && (
        <FeedbackTool route={pathname} onClose={() => setAnnotating(false)} />
      )}
      {inbox && <DevInbox onClose={() => setInbox(false)} />}
    </>
  );
}

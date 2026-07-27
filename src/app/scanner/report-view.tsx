"use client";

import type { ScanReport, Detection, PlatformSupport, SecurityFinding } from "@/lib/scanner/types";

const SEVERITY_STYLES: Record<SecurityFinding["severity"], string> = {
  critical: "bg-danger-bg text-accent-strong border-border",
  high: "bg-danger-bg text-accent-strong border-border",
  medium: "bg-warn-bg text-warn border-border",
  low: "bg-accent-bg text-accent-strong border-border",
  info: "bg-tile text-muted border-border",
};

const GRADE_STYLES: Record<string, string> = {
  A: "bg-good-bg text-good border-border",
  B: "bg-good-bg text-good border-border",
  C: "bg-warn-bg text-warn border-border",
  D: "bg-danger-bg text-accent-strong border-border",
  F: "bg-danger-bg text-accent-strong border-border",
};

const PLATFORM_STATUS: Record<PlatformSupport["supported"], { label: string; cls: string }> = {
  yes: { label: "Supported", cls: "bg-good-bg text-good" },
  partial: { label: "Partial", cls: "bg-warn-bg text-warn" },
  no: { label: "No", cls: "bg-danger-bg text-accent-strong" },
  unknown: { label: "Unknown", cls: "bg-tile text-muted" },
};

function DetectionGroup({ title, items }: { title: string; items: Detection[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-faint text-[10px] uppercase tracking-wide font-normal mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((d, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-[13.5px] text-ink">{d.name}</span>
            {d.detail && <span className="text-[12px] text-faint shrink-0">{d.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const PLATFORM_ICON: Record<PlatformSupport["platform"], string> = {
  iOS: "",
  Android: "🤖",
  Web: "🌐",
  Desktop: "🖥️",
};

export default function ReportView({ report }: { report: ScanReport }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-accent-strong">{report.source?.label || "Scan result"}</p>
            <h2 className="text-[21px] font-semibold tracking-tight text-ink mt-1">{report.projectType}</h2>
            <p className="text-muted text-[13.5px] mt-2 max-w-2xl">{report.summary}</p>
          </div>
          <div className={`shrink-0 w-20 h-20 rounded-xl border flex flex-col items-center justify-center ${GRADE_STYLES[report.security.grade]}`}>
            <span className="text-3xl font-bold leading-none">{report.security.grade}</span>
            <span className="text-[11px] mt-1 tabular-nums">{report.security.score}/100</span>
          </div>
        </div>
        {report.source?.truncated && (
          <p className="mt-3 text-[12px] text-warn">⚠ The project was large — analysis was based on a partial file listing.</p>
        )}
      </div>

      {/* Client summary */}
      <div className="bg-accent-bg border border-border rounded-xl p-5">
        <h3 className="text-[13px] font-semibold text-accent-strong mb-1">Client-friendly summary</h3>
        <p className="text-muted text-[13.5px]">{report.clientSummary}</p>
      </div>

      {/* Platform compatibility */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-ink mb-4">Platform compatibility</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {report.platforms.map((p, i) => {
            const status = PLATFORM_STATUS[p.supported];
            return (
              <div key={i} className="bg-tile border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-ink text-[13.5px]">
                    {PLATFORM_ICON[p.platform]} {p.platform}
                  </span>
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                </div>
                {p.approach && <p className="text-[13px] text-muted">{p.approach}</p>}
                {p.notes && <p className="text-[12px] text-faint mt-1">{p.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stack */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-ink mb-4">Stack &amp; technologies</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <DetectionGroup title="Languages" items={report.languages} />
          <DetectionGroup title="Frameworks" items={report.frameworks} />
          <DetectionGroup title="Database & data" items={report.database} />
          <DetectionGroup title="Styling" items={report.styling} />
          <DetectionGroup title="Hosting & deploy" items={report.hosting} />
          <DetectionGroup title="Package managers" items={report.packageManagers} />
          <DetectionGroup title="Tooling" items={report.tooling} />
        </div>
      </div>

      {/* Architecture */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-ink mb-4">Architecture</h3>
        {report.architecture.rendering && (
          <p className="text-[13.5px] text-muted mb-3">
            <span className="font-medium text-ink">Rendering:</span> {report.architecture.rendering}
          </p>
        )}
        {report.architecture.notes.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-[13.5px] text-muted">
            {report.architecture.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-faint">No notable structural patterns detected.</p>
        )}
        {report.architecture.entryPoints.length > 0 && (
          <p className="text-[12px] text-faint mt-3">
            Entry points: {report.architecture.entryPoints.map((e) => <code key={e} className="bg-tile text-muted px-1 rounded mr-1">{e}</code>)}
          </p>
        )}
      </div>

      {/* Security */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-medium text-ink">Security</h3>
          <span className="text-[13px] text-faint tabular-nums">{report.security.findings.length} finding(s)</span>
        </div>

        {/* score bar */}
        <div className="w-full bg-tile rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full ${report.security.score >= 75 ? "bg-good" : report.security.score >= 60 ? "bg-warn" : "bg-accent"}`}
            style={{ width: `${report.security.score}%` }}
          />
        </div>

        {report.security.positives.length > 0 && (
          <div className="mb-4">
            <h4 className="text-good text-[10px] uppercase tracking-wide font-normal mb-2">Good practices</h4>
            <ul className="space-y-1">
              {report.security.positives.map((p, i) => (
                <li key={i} className="text-[13.5px] text-muted flex gap-2">
                  <span className="text-good">✓</span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {report.security.findings.length > 0 ? (
          <div className="space-y-3">
            {report.security.findings.map((f, i) => (
              <div key={i} className={`border rounded-lg p-4 ${SEVERITY_STYLES[f.severity]}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-ink">{f.title}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded bg-page/40">{f.severity}</span>
                </div>
                <p className="text-[13px] text-muted">{f.detail}</p>
                {f.recommendation && (
                  <p className="text-[13px] text-ink mt-2">
                    <span className="font-medium">Fix:</span> {f.recommendation}
                  </p>
                )}
                {f.evidence && f.evidence.length > 0 && (
                  <p className="text-[12px] text-faint mt-2 truncate">Evidence: {f.evidence.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-faint">No security issues detected in the scanned files.</p>
        )}
      </div>

      {/* Stats */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-ink mb-4">At a glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="Files" value={report.stats.totalFiles.toLocaleString()} />
          <Stat label="Analyzed" value={report.stats.analyzedFiles.toLocaleString()} />
          <Stat label="Dependencies" value={report.stats.dependencyCount.toLocaleString()} />
          <Stat label="Security" value={`${report.security.score}/100`} />
        </div>
        {report.stats.topDependencies.length > 0 && (
          <p className="text-[12px] text-faint mt-4">
            Key deps: {report.stats.topDependencies.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-ink tabular-nums">{value}</div>
      <div className="text-[12px] text-faint mt-1">{label}</div>
    </div>
  );
}

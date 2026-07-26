"use client";

import type { ScanReport, Detection, PlatformSupport, SecurityFinding } from "@/lib/scanner/types";

const SEVERITY_STYLES: Record<SecurityFinding["severity"], string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-blue-100 text-blue-800 border-blue-200",
  info: "bg-gray-100 text-gray-700 border-gray-200",
};

const GRADE_STYLES: Record<string, string> = {
  A: "bg-green-100 text-green-700 border-green-300",
  B: "bg-lime-100 text-lime-700 border-lime-300",
  C: "bg-yellow-100 text-yellow-700 border-yellow-300",
  D: "bg-orange-100 text-orange-700 border-orange-300",
  F: "bg-red-100 text-red-700 border-red-300",
};

const PLATFORM_STATUS: Record<PlatformSupport["supported"], { label: string; cls: string }> = {
  yes: { label: "Supported", cls: "bg-green-100 text-green-800" },
  partial: { label: "Partial", cls: "bg-yellow-100 text-yellow-800" },
  no: { label: "No", cls: "bg-red-100 text-red-800" },
  unknown: { label: "Unknown", cls: "bg-gray-100 text-gray-600" },
};

function DetectionGroup({ title, items }: { title: string; items: Detection[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{title}</h4>
      <ul className="space-y-1.5">
        {items.map((d, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-gray-900">{d.name}</span>
            {d.detail && <span className="text-xs text-gray-400 shrink-0">{d.detail}</span>}
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-blue-600">{report.source?.label || "Scan result"}</p>
            <h2 className="text-2xl font-semibold text-gray-900 mt-1">{report.projectType}</h2>
            <p className="text-gray-600 mt-2 max-w-2xl">{report.summary}</p>
          </div>
          <div className={`shrink-0 w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center ${GRADE_STYLES[report.security.grade]}`}>
            <span className="text-3xl font-bold leading-none">{report.security.grade}</span>
            <span className="text-xs mt-1">{report.security.score}/100</span>
          </div>
        </div>
        {report.source?.truncated && (
          <p className="mt-3 text-xs text-amber-600">⚠ The project was large — analysis was based on a partial file listing.</p>
        )}
      </div>

      {/* Client summary */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Client-friendly summary</h3>
        <p className="text-blue-900/80">{report.clientSummary}</p>
      </div>

      {/* Platform compatibility */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Platform compatibility</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {report.platforms.map((p, i) => {
            const status = PLATFORM_STATUS[p.supported];
            return (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {PLATFORM_ICON[p.platform]} {p.platform}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.label}</span>
                </div>
                {p.approach && <p className="text-sm text-gray-700">{p.approach}</p>}
                {p.notes && <p className="text-xs text-gray-500 mt-1">{p.notes}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stack */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Stack &amp; technologies</h3>
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Architecture</h3>
        {report.architecture.rendering && (
          <p className="text-sm text-gray-700 mb-3">
            <span className="font-medium">Rendering:</span> {report.architecture.rendering}
          </p>
        )}
        {report.architecture.notes.length > 0 ? (
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
            {report.architecture.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No notable structural patterns detected.</p>
        )}
        {report.architecture.entryPoints.length > 0 && (
          <p className="text-xs text-gray-500 mt-3">
            Entry points: {report.architecture.entryPoints.map((e) => <code key={e} className="bg-gray-100 px-1 rounded mr-1">{e}</code>)}
          </p>
        )}
      </div>

      {/* Security */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Security</h3>
          <span className="text-sm text-gray-500">{report.security.findings.length} finding(s)</span>
        </div>

        {/* score bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full ${report.security.score >= 75 ? "bg-green-500" : report.security.score >= 60 ? "bg-yellow-500" : report.security.score >= 40 ? "bg-orange-500" : "bg-red-500"}`}
            style={{ width: `${report.security.score}%` }}
          />
        </div>

        {report.security.positives.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-2">Good practices</h4>
            <ul className="space-y-1">
              {report.security.positives.map((p, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-green-600">✓</span>
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
                  <span className="font-medium text-gray-900">{f.title}</span>
                  <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-white/60">{f.severity}</span>
                </div>
                <p className="text-sm text-gray-700">{f.detail}</p>
                {f.recommendation && (
                  <p className="text-sm text-gray-800 mt-2">
                    <span className="font-medium">Fix:</span> {f.recommendation}
                  </p>
                )}
                {f.evidence && f.evidence.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2 truncate">Evidence: {f.evidence.join(", ")}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No security issues detected in the scanned files.</p>
        )}
      </div>

      {/* Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">At a glance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <Stat label="Files" value={report.stats.totalFiles.toLocaleString()} />
          <Stat label="Analyzed" value={report.stats.analyzedFiles.toLocaleString()} />
          <Stat label="Dependencies" value={report.stats.dependencyCount.toLocaleString()} />
          <Stat label="Security" value={`${report.security.score}/100`} />
        </div>
        {report.stats.topDependencies.length > 0 && (
          <p className="text-xs text-gray-500 mt-4">
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
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

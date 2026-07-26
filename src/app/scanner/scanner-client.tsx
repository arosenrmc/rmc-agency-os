"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanReport } from "@/lib/scanner/types";
import ReportView from "./report-view";

type Project = { id: string; name: string };

type Props = {
  projects: Project[];
  localScanEnabled: boolean;
};

export default function ScannerClient({ projects, localScanEnabled }: Props) {
  const router = useRouter();
  const [source, setSource] = useState<"github" | "local">("github");
  const [value, setValue] = useState("");
  const [projectId, setProjectId] = useState("");
  const [save, setSave] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const runScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setReport(null);
    setSavedNote(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, value, projectId: projectId || null, save }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Scan failed.");
        return;
      }
      setReport(data.report as ScanReport);
      if (data.saved) {
        setSavedNote("Saved to scan history.");
        router.refresh();
      } else if (data.saveError) {
        setSavedNote(`Scan ran but could not be saved: ${data.saveError}`);
      }
    } catch {
      setError("Network error running the scan.");
    } finally {
      setLoading(false);
    }
  };

  const placeholder =
    source === "github"
      ? "https://github.com/owner/repo  (or owner/repo)"
      : "/Users/andrewrosen/projects/some-client-site";

  return (
    <div className="space-y-6">
      <form onSubmit={runScan} className="bg-white rounded-lg shadow-md p-6">
        {/* source toggle */}
        <div className="inline-flex rounded-md border border-gray-300 overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => setSource("github")}
            className={`px-4 py-2 text-sm font-medium ${source === "github" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            GitHub repo
          </button>
          <button
            type="button"
            onClick={() => setSource("local")}
            disabled={!localScanEnabled}
            title={localScanEnabled ? "" : "Available only when running the OS locally"}
            className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
              source === "local" ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Local folder
          </button>
        </div>

        <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
          {source === "github" ? "Repository URL" : "Absolute folder path"}
        </label>
        <input
          id="value"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm"
          placeholder={placeholder}
        />
        {source === "local" && (
          <p className="text-xs text-gray-500 mt-1">
            Reads a folder on the machine running this OS. Node modules, build output, and .git are skipped automatically.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label htmlFor="project" className="block text-sm font-medium text-gray-700 mb-1">
              Link to project (optional)
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— None —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} className="rounded border-gray-300" />
              Save to scan history
            </label>
          </div>
        </div>

        {error && <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? "Scanning…" : "Run scan"}
          </button>
          {savedNote && <span className="text-sm text-gray-500">{savedNote}</span>}
        </div>
      </form>

      {loading && (
        <div className="bg-white rounded-lg shadow-md p-10 text-center text-gray-500">
          Analyzing files, detecting stack, checking platforms and security…
        </div>
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}

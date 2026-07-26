// Reusable, framework-agnostic types for the Build Scanner.
// The engine consumes a FileTree and produces a ScanReport. Any input
// source (GitHub, local folder, zip upload) just needs to produce a FileTree.

export type ScanFile = {
  path: string; // repo-relative POSIX path, e.g. "src/app/page.tsx"
  size?: number;
  // content is only populated for "interesting" files (configs, manifests,
  // a sample of source). Large/binary files are listed by path only.
  content?: string;
};

export type FileTree = {
  files: ScanFile[];
  // Optional metadata about where the tree came from.
  meta?: {
    source: "github" | "local" | "upload";
    label?: string; // e.g. "vercel/next.js" or "/Users/me/project"
    truncated?: boolean; // true if we hit a file/size cap while collecting
  };
};

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Detection = {
  name: string;
  detail?: string;
  // Evidence: which files/patterns triggered this detection.
  evidence?: string[];
  confidence?: "certain" | "likely" | "possible";
};

export type SecurityFinding = {
  title: string;
  severity: Severity;
  detail: string;
  evidence?: string[];
  recommendation?: string;
};

export type PlatformSupport = {
  platform: "iOS" | "Android" | "Web" | "Desktop";
  supported: "yes" | "partial" | "no" | "unknown";
  approach?: string; // e.g. "React Native (Expo)", "Native SwiftUI", "PWA"
  notes?: string;
};

export type ScanReport = {
  scannedAt: string; // ISO
  source: FileTree["meta"];

  // High-level classification.
  projectType: string; // e.g. "Web application (Next.js)", "Mobile app (Flutter)"
  summary: string; // one-paragraph plain-English overview
  clientSummary: string; // non-technical summary for handing to a client

  // What it's built with.
  languages: Detection[];
  frameworks: Detection[];
  styling: Detection[];
  database: Detection[];
  hosting: Detection[];
  packageManagers: Detection[];
  tooling: Detection[];

  // How it's structured.
  architecture: {
    notes: string[];
    rendering?: string; // SSR / SSG / CSR / ISR / N/A
    isMonorepo: boolean;
    entryPoints: string[];
  };

  // Will it work on Apple / Android / Web?
  platforms: PlatformSupport[];

  // Security posture.
  security: {
    score: number; // 0-100
    grade: "A" | "B" | "C" | "D" | "F";
    findings: SecurityFinding[];
    positives: string[]; // good practices detected
  };

  // Quick stats.
  stats: {
    totalFiles: number;
    analyzedFiles: number;
    dependencyCount: number;
    topDependencies: string[];
  };
};

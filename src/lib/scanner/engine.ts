import type {
  FileTree,
  ScanFile,
  ScanReport,
  Detection,
  SecurityFinding,
  PlatformSupport,
} from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const has = (files: ScanFile[], predicate: (p: string) => boolean) =>
  files.some((f) => predicate(f.path.toLowerCase()));

const find = (files: ScanFile[], predicate: (p: string) => boolean) =>
  files.filter((f) => predicate(f.path.toLowerCase()));

const basename = (p: string) => p.split("/").pop() || p;

const readJson = (file?: ScanFile): Record<string, unknown> | null => {
  if (!file?.content) return null;
  try {
    return JSON.parse(file.content);
  } catch {
    return null;
  }
};

const dep = (pkg: Record<string, unknown> | null, name: string): boolean => {
  if (!pkg) return false;
  const deps = { ...(pkg.dependencies as object), ...(pkg.devDependencies as object) };
  return Object.prototype.hasOwnProperty.call(deps, name);
};

const anyDep = (pkg: Record<string, unknown> | null, names: string[]) =>
  names.some((n) => dep(pkg, n));

// Files whose contents matter for detection. Kept small on purpose.
export const INTERESTING_FILES = new Set([
  "package.json",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "requirements.txt",
  "pyproject.toml",
  "pipfile",
  "gemfile",
  "go.mod",
  "cargo.toml",
  "composer.json",
  "pubspec.yaml",
  "podfile",
  "build.gradle",
  "build.gradle.kts",
  "androidmanifest.xml",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vite.config.ts",
  "vite.config.js",
  "nuxt.config.ts",
  "svelte.config.js",
  "angular.json",
  "vercel.json",
  "netlify.toml",
  "dockerfile",
  "fly.toml",
  "tailwind.config.ts",
  "tailwind.config.js",
  "app.json", // expo / react-native
  "capacitor.config.ts",
  "capacitor.config.json",
  "ionic.config.json",
  ".env",
  ".env.local",
  ".env.production",
  ".gitignore",
  "manifest.json",
  "manifest.webmanifest",
]);

// File extensions we're happy to sample source content from (for secret scans).
const SCANNABLE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|py|rb|go|php|java|kt|swift|dart|env|yml|yaml|json|sql|sh)$/i;

// ---------------------------------------------------------------------------
// Language detection (by extension)
// ---------------------------------------------------------------------------

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript (React)",
  js: "JavaScript",
  jsx: "JavaScript (React)",
  mjs: "JavaScript",
  py: "Python",
  rb: "Ruby",
  go: "Go",
  rs: "Rust",
  php: "PHP",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  m: "Objective-C",
  dart: "Dart",
  cs: "C#",
  vue: "Vue",
  svelte: "Svelte",
  sql: "SQL",
};

function detectLanguages(files: ScanFile[]): Detection[] {
  const counts: Record<string, number> = {};
  for (const f of files) {
    const ext = f.path.split(".").pop()?.toLowerCase() || "";
    const lang = LANGUAGE_BY_EXT[ext];
    if (lang) counts[lang] = (counts[lang] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => ({
      name,
      detail: `${n} file${n === 1 ? "" : "s"}`,
      confidence: "certain" as const,
    }));
}

// ---------------------------------------------------------------------------
// Framework / stack detection
// ---------------------------------------------------------------------------

function detectFrameworks(files: ScanFile[], pkg: Record<string, unknown> | null): Detection[] {
  const out: Detection[] = [];
  const add = (name: string, detail?: string, evidence?: string[]) =>
    out.push({ name, detail, evidence, confidence: "likely" });

  // JS/TS frameworks
  if (dep(pkg, "next")) add("Next.js", (pkg?.dependencies as Record<string, string>)?.next, ["package.json"]);
  if (dep(pkg, "react") && !dep(pkg, "next") && !dep(pkg, "react-native")) add("React", undefined, ["package.json"]);
  if (dep(pkg, "vue") || dep(pkg, "nuxt")) add(dep(pkg, "nuxt") ? "Nuxt (Vue)" : "Vue", undefined, ["package.json"]);
  if (anyDep(pkg, ["@angular/core"])) add("Angular", undefined, ["package.json"]);
  if (dep(pkg, "svelte") || dep(pkg, "@sveltejs/kit")) add("Svelte / SvelteKit", undefined, ["package.json"]);
  if (dep(pkg, "express")) add("Express (Node API)", undefined, ["package.json"]);
  if (dep(pkg, "fastify")) add("Fastify (Node API)", undefined, ["package.json"]);
  if (dep(pkg, "@nestjs/core")) add("NestJS", undefined, ["package.json"]);

  // Mobile / cross-platform
  if (dep(pkg, "react-native")) add("React Native", undefined, ["package.json"]);
  if (dep(pkg, "expo")) add("Expo (React Native)", undefined, ["package.json"]);
  if (anyDep(pkg, ["@capacitor/core"]) || has(files, (p) => p.includes("capacitor.config")))
    add("Capacitor (hybrid native)", undefined, ["capacitor.config"]);
  if (anyDep(pkg, ["@ionic/react", "@ionic/angular", "@ionic/vue"])) add("Ionic", undefined, ["package.json"]);
  if (has(files, (p) => basename(p) === "pubspec.yaml")) add("Flutter", "Dart-based cross-platform", ["pubspec.yaml"]);

  // Native mobile
  if (has(files, (p) => p.endsWith(".xcodeproj") || p.includes(".xcworkspace") || basename(p) === "podfile"))
    add("Native iOS (Xcode)", undefined, ["*.xcodeproj / Podfile"]);
  if (has(files, (p) => basename(p) === "androidmanifest.xml" || basename(p).startsWith("build.gradle")))
    add("Native Android (Gradle)", undefined, ["AndroidManifest.xml / build.gradle"]);

  // Backend (non-JS)
  if (has(files, (p) => basename(p) === "requirements.txt" || basename(p) === "pyproject.toml")) {
    const reqs = files.find((f) => basename(f.path).toLowerCase() === "requirements.txt")?.content || "";
    if (/django/i.test(reqs)) add("Django (Python)", undefined, ["requirements.txt"]);
    else if (/flask/i.test(reqs)) add("Flask (Python)", undefined, ["requirements.txt"]);
    else if (/fastapi/i.test(reqs)) add("FastAPI (Python)", undefined, ["requirements.txt"]);
    else add("Python project", undefined, ["requirements.txt / pyproject.toml"]);
  }
  if (has(files, (p) => basename(p) === "gemfile")) {
    const gem = files.find((f) => basename(f.path).toLowerCase() === "gemfile")?.content || "";
    add(/rails/i.test(gem) ? "Ruby on Rails" : "Ruby project", undefined, ["Gemfile"]);
  }
  if (has(files, (p) => basename(p) === "composer.json")) add("PHP / Composer", undefined, ["composer.json"]);
  if (has(files, (p) => basename(p) === "go.mod")) add("Go module", undefined, ["go.mod"]);
  if (has(files, (p) => basename(p) === "cargo.toml")) add("Rust (Cargo)", undefined, ["Cargo.toml"]);

  return out;
}

function detectStyling(files: ScanFile[], pkg: Record<string, unknown> | null): Detection[] {
  const out: Detection[] = [];
  if (dep(pkg, "tailwindcss") || has(files, (p) => basename(p).startsWith("tailwind.config")))
    out.push({ name: "Tailwind CSS", confidence: "certain" });
  if (anyDep(pkg, ["styled-components"])) out.push({ name: "styled-components", confidence: "likely" });
  if (anyDep(pkg, ["@emotion/react", "@emotion/styled"])) out.push({ name: "Emotion", confidence: "likely" });
  if (anyDep(pkg, ["sass", "node-sass"]) || has(files, (p) => p.endsWith(".scss")))
    out.push({ name: "Sass/SCSS", confidence: "likely" });
  if (has(files, (p) => p.endsWith(".module.css"))) out.push({ name: "CSS Modules", confidence: "likely" });
  if (anyDep(pkg, ["@mui/material", "@chakra-ui/react", "antd", "@mantine/core"]))
    out.push({ name: "Component library (MUI/Chakra/AntD/Mantine)", confidence: "likely" });
  return out;
}

function detectDatabase(files: ScanFile[], pkg: Record<string, unknown> | null): Detection[] {
  const out: Detection[] = [];
  if (anyDep(pkg, ["@supabase/supabase-js", "@supabase/ssr"]) || has(files, (p) => p.includes("supabase/")))
    out.push({ name: "Supabase (Postgres)", confidence: "certain", evidence: ["@supabase/*"] });
  if (anyDep(pkg, ["prisma", "@prisma/client"]) || has(files, (p) => basename(p) === "schema.prisma"))
    out.push({ name: "Prisma ORM", confidence: "likely" });
  if (anyDep(pkg, ["firebase", "firebase-admin"])) out.push({ name: "Firebase", confidence: "likely" });
  if (anyDep(pkg, ["mongoose", "mongodb"])) out.push({ name: "MongoDB", confidence: "likely" });
  if (anyDep(pkg, ["pg", "postgres"])) out.push({ name: "PostgreSQL (direct)", confidence: "likely" });
  if (anyDep(pkg, ["mysql", "mysql2"])) out.push({ name: "MySQL", confidence: "likely" });
  if (anyDep(pkg, ["drizzle-orm"])) out.push({ name: "Drizzle ORM", confidence: "likely" });
  return out;
}

function detectHosting(files: ScanFile[]): Detection[] {
  const out: Detection[] = [];
  if (has(files, (p) => basename(p) === "vercel.json" || p.startsWith(".vercel/")))
    out.push({ name: "Vercel", confidence: "certain" });
  if (has(files, (p) => basename(p) === "netlify.toml")) out.push({ name: "Netlify", confidence: "certain" });
  if (has(files, (p) => basename(p) === "dockerfile")) out.push({ name: "Docker", confidence: "certain" });
  if (has(files, (p) => basename(p) === "fly.toml")) out.push({ name: "Fly.io", confidence: "certain" });
  if (has(files, (p) => p.includes(".github/workflows/"))) out.push({ name: "GitHub Actions (CI/CD)", confidence: "certain" });
  if (has(files, (p) => basename(p) === "amplify.yml" || p.includes("amplify/"))) out.push({ name: "AWS Amplify", confidence: "likely" });
  return out;
}

function detectPackageManagers(files: ScanFile[]): Detection[] {
  const out: Detection[] = [];
  if (has(files, (p) => basename(p) === "package-lock.json")) out.push({ name: "npm", confidence: "certain" });
  if (has(files, (p) => basename(p) === "yarn.lock")) out.push({ name: "Yarn", confidence: "certain" });
  if (has(files, (p) => basename(p) === "pnpm-lock.yaml")) out.push({ name: "pnpm", confidence: "certain" });
  if (has(files, (p) => basename(p) === "bun.lockb")) out.push({ name: "Bun", confidence: "certain" });
  if (has(files, (p) => basename(p) === "podfile")) out.push({ name: "CocoaPods", confidence: "certain" });
  return out;
}

function detectTooling(pkg: Record<string, unknown> | null, files: ScanFile[]): Detection[] {
  const out: Detection[] = [];
  if (dep(pkg, "typescript") || has(files, (p) => basename(p) === "tsconfig.json"))
    out.push({ name: "TypeScript", confidence: "certain" });
  if (anyDep(pkg, ["jest", "vitest", "@testing-library/react", "cypress", "playwright"]))
    out.push({ name: "Automated tests", confidence: "likely" });
  if (anyDep(pkg, ["eslint"])) out.push({ name: "ESLint", confidence: "likely" });
  if (anyDep(pkg, ["zod", "yup", "joi", "valibot"])) out.push({ name: "Schema validation", confidence: "likely" });
  return out;
}

// ---------------------------------------------------------------------------
// Architecture
// ---------------------------------------------------------------------------

function analyzeArchitecture(files: ScanFile[], pkg: Record<string, unknown> | null, frameworks: Detection[]) {
  const notes: string[] = [];
  let rendering: string | undefined;
  const entryPoints: string[] = [];

  const isNext = frameworks.some((f) => f.name.startsWith("Next.js"));
  if (isNext) {
    const appRouter = has(files, (p) => /(^|\/)(src\/)?app\/(page|layout)\.(t|j)sx?$/.test(p));
    const pagesRouter = has(files, (p) => /(^|\/)(src\/)?pages\//.test(p));
    if (appRouter) notes.push("Next.js App Router");
    if (pagesRouter) notes.push("Next.js Pages Router");
    rendering = appRouter ? "Server Components + SSR/SSG (App Router)" : "SSR/SSG (Pages Router)";
    const layout = find(files, (p) => /app\/layout\.(t|j)sx?$/.test(p))[0];
    if (layout) entryPoints.push(layout.path);
  }

  // Monorepo detection
  const workspaces =
    !!(pkg && (pkg.workspaces || dep(pkg, "turbo"))) ||
    has(files, (p) => basename(p) === "pnpm-workspace.yaml" || basename(p) === "lerna.json" || basename(p) === "turbo.json");
  if (workspaces) notes.push("Monorepo (workspaces detected)");

  // API surface
  if (has(files, (p) => /app\/api\/.*route\.(t|j)s$/.test(p))) notes.push("Has server API routes (app/api)");
  if (has(files, (p) => /(^|\/)pages\/api\//.test(p))) notes.push("Has server API routes (pages/api)");

  // Common entry points
  for (const cand of ["src/main.tsx", "src/main.ts", "src/index.tsx", "src/index.ts", "main.py", "app.py", "index.js", "server.js"]) {
    const f = files.find((x) => x.path.toLowerCase() === cand);
    if (f) entryPoints.push(f.path);
  }

  return { notes, rendering, isMonorepo: workspaces, entryPoints };
}

// ---------------------------------------------------------------------------
// Platform compatibility (Apple / Android / Web)
// ---------------------------------------------------------------------------

function analyzePlatforms(files: ScanFile[], frameworks: Detection[]): PlatformSupport[] {
  const fw = (name: string) => frameworks.some((f) => f.name.toLowerCase().includes(name.toLowerCase()));

  const hasIosNative = has(files, (p) => p.includes(".xcodeproj") || p.includes(".xcworkspace") || basename(p) === "podfile" || p.startsWith("ios/"));
  const hasAndroidNative = has(files, (p) => basename(p) === "androidmanifest.xml" || basename(p).startsWith("build.gradle") || p.startsWith("android/"));
  const isFlutter = fw("flutter");
  const isRN = fw("react native") || fw("expo");
  const isCapacitor = fw("capacitor") || fw("ionic");

  // PWA?
  const manifest = files.find((f) => ["manifest.json", "manifest.webmanifest"].includes(basename(f.path).toLowerCase()));
  const hasServiceWorker = has(files, (p) => /(^|\/)(service-worker|sw)\.(t|j)s$/.test(p) || p.includes("workbox") || basename(p) === "sw.js");
  const isPwa = !!manifest && hasServiceWorker;

  const isWebApp = fw("next") || fw("react") || fw("vue") || fw("nuxt") || fw("svelte") || fw("angular");
  const isNodeApi = fw("express") || fw("fastify") || fw("nest");

  const out: PlatformSupport[] = [];

  // Cross-platform frameworks answer both mobile platforms at once.
  if (isFlutter) {
    out.push({ platform: "iOS", supported: "yes", approach: "Flutter (compiles to native iOS)", notes: "Needs macOS + Xcode to build & submit to App Store." });
    out.push({ platform: "Android", supported: "yes", approach: "Flutter (compiles to native Android)", notes: "Builds an APK/AAB for Google Play." });
    out.push({ platform: "Web", supported: "partial", approach: "Flutter web", notes: "Supported but heavier than a native web app." });
  } else if (isRN) {
    out.push({ platform: "iOS", supported: "yes", approach: "React Native" + (fw("expo") ? " (Expo)" : ""), notes: fw("expo") ? "Expo EAS can build without a local Mac." : "Requires macOS + Xcode for iOS builds." });
    out.push({ platform: "Android", supported: "yes", approach: "React Native" + (fw("expo") ? " (Expo)" : ""), notes: "Builds for Google Play." });
    out.push({ platform: "Web", supported: fw("expo") ? "partial" : "unknown", approach: fw("expo") ? "react-native-web (Expo)" : undefined });
  } else if (isCapacitor) {
    out.push({ platform: "iOS", supported: "yes", approach: "Capacitor (web wrapped in native shell)", notes: "Web UI runs in a native WebView; needs Xcode to submit." });
    out.push({ platform: "Android", supported: "yes", approach: "Capacitor (web wrapped in native shell)" });
    out.push({ platform: "Web", supported: "yes", approach: "Runs as a normal web app too" });
  } else {
    // Native-only signals
    out.push({
      platform: "iOS",
      supported: hasIosNative ? "yes" : isWebApp ? "partial" : "unknown",
      approach: hasIosNative ? "Native iOS project" : isWebApp ? "Web (runs in mobile Safari; installable if PWA)" : undefined,
      notes: hasIosNative ? "Native Swift/Obj-C app." : isWebApp && !isPwa ? "Not a native app. Wrap with Capacitor/React Native to ship to the App Store." : undefined,
    });
    out.push({
      platform: "Android",
      supported: hasAndroidNative ? "yes" : isWebApp ? "partial" : "unknown",
      approach: hasAndroidNative ? "Native Android project" : isWebApp ? "Web (runs in mobile Chrome; installable if PWA)" : undefined,
      notes: hasAndroidNative ? "Native Kotlin/Java app." : isWebApp && !isPwa ? "Not a native app. Use a PWA or wrapper to ship to Google Play." : undefined,
    });
  }

  // Web verdict (skip if we already added a web line above)
  if (!out.some((p) => p.platform === "Web")) {
    out.push({
      platform: "Web",
      supported: isWebApp ? "yes" : isNodeApi ? "partial" : "unknown",
      approach: isWebApp ? (isPwa ? "Web app (installable PWA)" : "Web app") : isNodeApi ? "Backend API (no UI)" : undefined,
      notes: isPwa ? "Has a web manifest + service worker — installable on phones." : undefined,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Security scanning
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: { re: RegExp; label: string; severity: SecurityFinding["severity"] }[] = [
  { re: /-----BEGIN (RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/, label: "Private key committed", severity: "critical" },
  { re: /AKIA[0-9A-Z]{16}/, label: "AWS access key ID", severity: "critical" },
  { re: /sk_live_[0-9a-zA-Z]{16,}/, label: "Stripe live secret key", severity: "critical" },
  { re: /sk-[A-Za-z0-9]{32,}/, label: "OpenAI-style secret key", severity: "high" },
  { re: /ghp_[0-9A-Za-z]{36}/, label: "GitHub personal access token", severity: "high" },
  { re: /xox[baprs]-[0-9A-Za-z-]{10,}/, label: "Slack token", severity: "high" },
  { re: /AIza[0-9A-Za-z_\-]{35}/, label: "Google API key", severity: "medium" },
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, label: "Hardcoded JWT", severity: "medium" },
];

function analyzeSecurity(files: ScanFile[], pkg: Record<string, unknown> | null): ScanReport["security"] {
  const findings: SecurityFinding[] = [];
  const positives: string[] = [];

  // 1) .env committed and not ignored
  const gitignore = files.find((f) => basename(f.path).toLowerCase() === ".gitignore")?.content || "";
  const envFiles = find(files, (p) => /(^|\/)\.env(\.|$)/.test(basename(p)) || basename(p) === ".env");
  const envIgnored = /(^|\n)\s*\.env/i.test(gitignore) || /\*\.env/i.test(gitignore) || /\.env\*/i.test(gitignore);
  const committedEnv = envFiles.filter((f) => !basename(f.path).endsWith(".example") && !basename(f.path).endsWith(".sample"));
  if (committedEnv.length && !envIgnored) {
    findings.push({
      title: "Environment file present without .gitignore coverage",
      severity: "high",
      detail: `Found ${committedEnv.map((f) => f.path).join(", ")} but .gitignore does not clearly exclude .env files. Secrets may be committed.`,
      evidence: committedEnv.map((f) => f.path),
      recommendation: "Add `.env*` to .gitignore and rotate any exposed keys.",
    });
  } else if (envIgnored) {
    positives.push(".env files are excluded via .gitignore");
  }

  // 2) Hardcoded secrets in scannable source
  const scannable = files.filter((f) => f.content && SCANNABLE_EXT.test(f.path));
  for (const f of scannable) {
    const content = f.content!;
    for (const { re, label, severity } of SECRET_PATTERNS) {
      if (re.test(content)) {
        findings.push({
          title: `${label} found in source`,
          severity,
          detail: `Potential secret matching a ${label} pattern in ${f.path}.`,
          evidence: [f.path],
          recommendation: "Move secrets to environment variables and rotate the exposed credential.",
        });
      }
    }
  }

  // 3) Dependency hygiene
  const hasLockfile = has(files, (p) =>
    ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"].includes(basename(p))
  );
  if (pkg && !hasLockfile) {
    findings.push({
      title: "No dependency lockfile",
      severity: "low",
      detail: "A lockfile pins exact dependency versions. Without one, builds are non-reproducible and more exposed to supply-chain drift.",
      recommendation: "Commit the lockfile (package-lock.json / pnpm-lock.yaml / yarn.lock).",
    });
  } else if (hasLockfile) {
    positives.push("Dependencies are pinned via a lockfile");
  }

  // 4) Auth presence
  const authLibs = ["@supabase/supabase-js", "@supabase/ssr", "next-auth", "@auth/core", "passport", "firebase", "@clerk/nextjs", "jsonwebtoken"];
  if (anyDep(pkg, authLibs)) positives.push("Authentication library present (" + authLibs.filter((l) => dep(pkg, l)).join(", ") + ")");

  // 5) Supabase RLS check (their stack): every table migration should enable RLS
  const migrations = find(files, (p) => p.includes("supabase/migrations/") && p.endsWith(".sql"));
  if (migrations.length) {
    let createTables = 0;
    let rlsEnables = 0;
    for (const m of migrations) {
      const c = (m.content || "").toLowerCase();
      createTables += (c.match(/create table/g) || []).length;
      rlsEnables += (c.match(/enable row level security/g) || []).length;
    }
    if (createTables > 0 && rlsEnables === 0) {
      findings.push({
        title: "Supabase tables without Row Level Security",
        severity: "high",
        detail: `${createTables} table(s) created but no "ENABLE ROW LEVEL SECURITY" found. Data may be world-readable via the anon key.`,
        evidence: migrations.map((m) => m.path),
        recommendation: "Enable RLS and add per-user policies on every table.",
      });
    } else if (rlsEnables > 0) {
      positives.push(`Row Level Security enabled in ${rlsEnables} migration statement(s)`);
    }
  }

  // 6) Security headers / middleware
  const nextConfig = files.find((f) => basename(f.path).startsWith("next.config"))?.content || "";
  if (/headers\s*\(/.test(nextConfig) || anyDep(pkg, ["helmet"])) positives.push("Custom security headers configured");
  if (has(files, (p) => basename(p) === "middleware.ts" || basename(p) === "middleware.js")) positives.push("Edge/middleware layer present (route protection)");

  // 7) Dangerous patterns — match real usage, not bare mentions (comments,
  // docs, or a scanner's own detection strings shouldn't trip this).
  const DANGEROUS_RE =
    /dangerouslySetInnerHTML\s*[=:]|(^|[^.\w])eval\s*\(|require\(\s*['"]child_process['"]|from\s+['"]child_process['"]|child_process\.\w/;
  const dangerous = scannable.filter((f) => DANGEROUS_RE.test(f.content!));
  if (dangerous.length) {
    findings.push({
      title: "Potentially unsafe code patterns",
      severity: "medium",
      detail: `Found dangerouslySetInnerHTML / eval / child_process usage in ${dangerous.length} file(s). These can enable XSS or command injection if fed untrusted input.`,
      evidence: dangerous.slice(0, 5).map((f) => f.path),
      recommendation: "Sanitize any user-controlled input reaching these calls; prefer safer alternatives.",
    });
  }

  // 8) Input validation
  if (anyDep(pkg, ["zod", "yup", "joi", "valibot"])) positives.push("Input validation library in use");

  // ---- Score ----
  const weight: Record<SecurityFinding["severity"], number> = { critical: 40, high: 20, medium: 10, low: 4, info: 1 };
  let score = 100;
  for (const f of findings) score -= weight[f.severity];
  score += Math.min(positives.length * 3, 15); // small credit for good practices
  score = Math.max(0, Math.min(100, score));
  const grade: ScanReport["security"]["grade"] =
    score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";

  // stable severity ordering
  const order: SecurityFinding["severity"][] = ["critical", "high", "medium", "low", "info"];
  findings.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));

  return { score, grade, findings, positives };
}

// ---------------------------------------------------------------------------
// Project classification + summaries
// ---------------------------------------------------------------------------

function classify(frameworks: Detection[], platforms: PlatformSupport[]): string {
  const fw = frameworks[0]?.name;
  const mobile = platforms.some((p) => (p.platform === "iOS" || p.platform === "Android") && p.supported === "yes");
  const web = platforms.some((p) => p.platform === "Web" && p.supported === "yes");
  if (mobile && web) return `Cross-platform app (${fw ?? "mobile + web"})`;
  if (mobile) return `Mobile app (${fw ?? "native"})`;
  if (fw && /express|fastify|nest|django|flask|fastapi|rails|go module/i.test(fw)) return `Backend / API service (${fw})`;
  if (web) return `Web application${fw ? ` (${fw})` : ""}`;
  return fw ? `${fw} project` : "Software project";
}

function buildSummary(report: Omit<ScanReport, "summary" | "clientSummary">): string {
  const langs = report.languages.slice(0, 3).map((l) => l.name).join(", ");
  const fw = report.frameworks.slice(0, 3).map((f) => f.name).join(", ") || "no major framework detected";
  const db = report.database.map((d) => d.name).join(", ");
  const host = report.hosting.map((h) => h.name).join(", ");
  const parts = [
    `This is a ${report.projectType.toLowerCase()} written primarily in ${langs || "an unrecognized language"}.`,
    `It is built with ${fw}.`,
  ];
  if (db) parts.push(`Data is handled via ${db}.`);
  if (host) parts.push(`Deployment targets: ${host}.`);
  if (report.architecture.rendering) parts.push(`Rendering: ${report.architecture.rendering}.`);
  parts.push(`Security posture scored ${report.security.score}/100 (grade ${report.security.grade}) with ${report.security.findings.length} finding(s).`);
  return parts.join(" ");
}

function buildClientSummary(report: Omit<ScanReport, "summary" | "clientSummary">): string {
  const mobile = report.platforms.filter((p) => (p.platform === "iOS" || p.platform === "Android") && p.supported === "yes").map((p) => p.platform);
  const web = report.platforms.find((p) => p.platform === "Web")?.supported === "yes";
  const platformLine =
    mobile.length && web ? `It can run on ${mobile.join(" & ")} and the web.`
    : mobile.length ? `It runs on ${mobile.join(" & ")}.`
    : web ? "It runs in a web browser."
    : "Its target platform could not be determined.";
  const sec =
    report.security.grade === "A" || report.security.grade === "B"
      ? "Security fundamentals look solid."
      : report.security.grade === "C"
      ? "Security is acceptable but has room to improve."
      : "Security needs attention before launch.";
  const critical = report.security.findings.filter((f) => f.severity === "critical" || f.severity === "high").length;
  const secDetail = critical ? ` There ${critical === 1 ? "is" : "are"} ${critical} higher-priority item(s) to address.` : "";
  return `${report.projectType}. ${platformLine} ${sec}${secDetail}`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function analyze(tree: FileTree): ScanReport {
  const files = tree.files;
  const pkg = readJson(files.find((f) => basename(f.path).toLowerCase() === "package.json"));

  const languages = detectLanguages(files);
  const frameworks = detectFrameworks(files, pkg);
  const styling = detectStyling(files, pkg);
  const database = detectDatabase(files, pkg);
  const hosting = detectHosting(files);
  const packageManagers = detectPackageManagers(files);
  const tooling = detectTooling(pkg, files);
  const architecture = analyzeArchitecture(files, pkg, frameworks);
  const platforms = analyzePlatforms(files, frameworks);
  const security = analyzeSecurity(files, pkg);
  const projectType = classify(frameworks, platforms);

  const deps = pkg ? { ...(pkg.dependencies as object), ...(pkg.devDependencies as object) } : {};
  const depNames = Object.keys(deps);

  const partial: Omit<ScanReport, "summary" | "clientSummary"> = {
    scannedAt: new Date().toISOString(),
    source: tree.meta,
    projectType,
    languages,
    frameworks,
    styling,
    database,
    hosting,
    packageManagers,
    tooling,
    architecture,
    platforms,
    security,
    stats: {
      totalFiles: files.length,
      analyzedFiles: files.filter((f) => f.content).length,
      dependencyCount: depNames.length,
      topDependencies: depNames.slice(0, 12),
    },
  };

  return {
    ...partial,
    summary: buildSummary(partial),
    clientSummary: buildClientSummary(partial),
  };
}

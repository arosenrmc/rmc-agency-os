export type Client = {
  id: string;
  user_id: string;
  org_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  status: "active" | "inactive" | "lead";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  user_id: string;
  client_id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: "planning" | "active" | "on-hold" | "completed" | "archived";
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
};

export type Scan = {
  id: string;
  user_id: string;
  project_id: string | null;
  org_id: string;
  source_type: "github" | "local" | "upload";
  source_label: string;
  project_type: string | null;
  security_score: number | null;
  security_grade: string | null;
  // Full ScanReport (see src/lib/scanner/types.ts). Stored as JSONB.
  report: unknown;
  created_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  user_id: string;
  org_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in-progress" | "review" | "done";
  priority: "low" | "medium" | "high";
  assigned_to: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrgRole = "owner" | "admin" | "member" | "client";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Membership = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgRole;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

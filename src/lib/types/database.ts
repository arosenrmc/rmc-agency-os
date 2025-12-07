export type Client = {
  id: string;
  user_id: string;
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
  name: string;
  description: string | null;
  status: "planning" | "active" | "on-hold" | "completed" | "archived";
  start_date: string | null;
  due_date: string | null;
  budget: number | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  project_id: string;
  user_id: string;
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

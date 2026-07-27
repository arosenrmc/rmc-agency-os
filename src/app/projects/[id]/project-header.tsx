"use client";

import { Project } from "@/lib/types/database";

type ProjectWithClient = Project & {
  clients: {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
  } | null;
};

type ProjectHeaderProps = {
  project: ProjectWithClient;
};

export default function ProjectHeader({ project }: ProjectHeaderProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-tile text-muted";
      case "active":
        return "bg-good-bg text-good";
      case "on-hold":
        return "bg-warn-bg text-warn";
      case "completed":
        return "bg-accent-bg text-accent-strong";
      case "archived":
        return "bg-tile text-faint";
      default:
        return "bg-tile text-muted";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("-").map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight text-ink mb-2">
            {project.name}
          </h1>
          <div className="flex items-center gap-4 text-[13.5px] text-muted">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span>{project.clients?.company || project.clients?.name}</span>
            </div>
          </div>
        </div>
        <span
          className={`inline-flex rounded-full text-[11px] font-medium px-2.5 py-1 ${getStatusColor(
            project.status
          )}`}
        >
          {formatStatus(project.status)}
        </span>
      </div>

      {project.description && (
        <p className="text-muted text-[13.5px] mb-6">{project.description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-border pt-6">
        {project.start_date && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint mb-1">
              Start Date
            </div>
            <div className="text-[14px] text-ink tabular-nums">
              {new Date(project.start_date).toLocaleDateString()}
            </div>
          </div>
        )}

        {project.due_date && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint mb-1">
              Due Date
            </div>
            <div className="text-[14px] text-ink tabular-nums">
              {new Date(project.due_date).toLocaleDateString()}
            </div>
          </div>
        )}

        {project.budget && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-faint mb-1">Budget</div>
            <div className="text-[14px] text-ink tabular-nums">
              ${project.budget.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {project.clients && (
        <div className="mt-6 pt-6 border-t border-border">
          <div className="text-[10px] uppercase tracking-wide text-faint mb-2">
            Client Contact
          </div>
          <div className="flex flex-col gap-1">
            {project.clients.email && (
              <a
                href={`mailto:${project.clients.email}`}
                className="text-accent-strong hover:text-accent text-[13px] transition-colors"
              >
                {project.clients.email}
              </a>
            )}
            {project.clients.phone && (
              <a
                href={`tel:${project.clients.phone}`}
                className="text-accent-strong hover:text-accent text-[13px] transition-colors"
              >
                {project.clients.phone}
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

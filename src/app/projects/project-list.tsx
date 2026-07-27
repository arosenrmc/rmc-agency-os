"use client";

import { useState } from "react";
import Link from "next/link";
import { Project } from "@/lib/types/database";

type ProjectWithClient = Project & {
  clients: {
    id: string;
    name: string;
    company: string | null;
  } | null;
};

type ProjectListProps = {
  projects: ProjectWithClient[];
};

export default function ProjectList({ projects }: ProjectListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProjects = statusFilter === "all"
    ? projects
    : projects.filter(p => p.status === statusFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning":
        return "bg-tile text-muted";
      case "active":
        return "bg-good-bg text-good";
      case "on-hold":
        return "bg-warn-bg text-warn";
      case "completed":
        return "bg-good-bg text-good";
      case "archived":
        return "bg-tile text-muted";
      default:
        return "bg-tile text-muted";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("-").map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (projects.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-faint"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <h3 className="mt-2 text-[15px] font-medium text-ink">No projects</h3>
        <p className="mt-1 text-[13.5px] text-faint">
          Get started by creating your first project.
        </p>
      </div>
    );
  }

  const filterButtonClass = (isActive: boolean) =>
    `px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent hover:bg-accent-strong text-white"
        : "bg-tile border border-border text-ink hover:border-faint"
    }`;

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={filterButtonClass(statusFilter === "all")}
        >
          All ({projects.length})
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={filterButtonClass(statusFilter === "active")}
        >
          Active ({projects.filter(p => p.status === "active").length})
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className={filterButtonClass(statusFilter === "completed")}
        >
          Completed ({projects.filter(p => p.status === "completed").length})
        </button>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="min-w-full text-[13px]">
          <thead>
            <tr>
              {["Project", "Client", "Status", "Due Date"].map((h) => (
                <th
                  key={h}
                  className="text-left text-faint text-[10px] uppercase tracking-wide font-normal py-3 px-4 border-b border-border"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((project) => (
              <tr
                key={project.id}
                className="border-b border-border last:border-0 hover:bg-tile transition-colors"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-accent hover:text-accent-strong font-medium"
                  >
                    {project.name}
                  </Link>
                  {project.description && (
                    <p className="text-[13px] text-faint mt-1">
                      {project.description.length > 60
                        ? project.description.substring(0, 60) + "..."
                        : project.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {project.clients?.company || project.clients?.name || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full text-[11px] font-medium px-2.5 py-1 ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {formatStatus(project.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted tabular-nums">
                  {project.due_date
                    ? new Date(project.due_date).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
        return "bg-gray-100 text-gray-800";
      case "active":
        return "bg-green-100 text-green-800";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "archived":
        return "bg-gray-100 text-gray-500";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatStatus = (status: string) => {
    return status.split("-").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  if (projects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first project.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          All ({projects.length})
        </button>
        <button
          onClick={() => setStatusFilter("active")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === "active"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          Active ({projects.filter(p => p.status === "active").length})
        </button>
        <button
          onClick={() => setStatusFilter("completed")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            statusFilter === "completed"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
          }`}
        >
          Completed ({projects.filter(p => p.status === "completed").length})
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Due Date
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredProjects.map((project) => (
              <tr
                key={project.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {project.name}
                  </Link>
                  {project.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {project.description.length > 60
                        ? project.description.substring(0, 60) + "..."
                        : project.description}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {project.clients?.company || project.clients?.name || "—"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      project.status
                    )}`}
                  >
                    {formatStatus(project.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
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

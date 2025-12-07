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

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {project.name}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
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
          className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
            project.status
          )}`}
        >
          {formatStatus(project.status)}
        </span>
      </div>

      {project.description && (
        <p className="text-gray-700 mb-6">{project.description}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t pt-6">
        {project.start_date && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">
              Start Date
            </div>
            <div className="text-base text-gray-900">
              {new Date(project.start_date).toLocaleDateString()}
            </div>
          </div>
        )}

        {project.due_date && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">
              Due Date
            </div>
            <div className="text-base text-gray-900">
              {new Date(project.due_date).toLocaleDateString()}
            </div>
          </div>
        )}

        {project.budget && (
          <div>
            <div className="text-sm font-medium text-gray-500 mb-1">Budget</div>
            <div className="text-base text-gray-900">
              ${project.budget.toLocaleString()}
            </div>
          </div>
        )}
      </div>

      {project.clients && (
        <div className="mt-6 pt-6 border-t">
          <div className="text-sm font-medium text-gray-500 mb-2">
            Client Contact
          </div>
          <div className="flex flex-col gap-1">
            {project.clients.email && (
              <a
                href={`mailto:${project.clients.email}`}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {project.clients.email}
              </a>
            )}
            {project.clients.phone && (
              <a
                href={`tel:${project.clients.phone}`}
                className="text-blue-600 hover:text-blue-800 text-sm"
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

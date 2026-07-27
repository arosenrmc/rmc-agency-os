"use client";

import { Client } from "@/lib/types/database";

type ClientListProps = {
  clients: Client[];
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-good-bg text-good",
  lead: "bg-accent-bg text-accent-strong",
  inactive: "bg-tile text-muted",
};

export default function ClientList({ clients }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-12 text-center">
        <h3 className="text-[15px] font-medium mb-1.5 text-ink">No clients yet</h3>
        <p className="text-faint text-[13.5px]">
          Add your first client to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <table className="min-w-full text-[13px]">
        <thead>
          <tr>
            {["Client", "Company", "Email", "Phone", "Status"].map((h) => (
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
          {clients.map((client) => (
            <tr
              key={client.id}
              className="border-b border-border last:border-0 hover:bg-tile transition-colors"
            >
              <td className="px-4 py-3 font-medium text-ink">{client.name}</td>
              <td className="px-4 py-3 text-muted">{client.company || "—"}</td>
              <td className="px-4 py-3 text-muted">{client.email || "—"}</td>
              <td className="px-4 py-3 text-muted">{client.phone || "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full text-[11px] font-medium px-2.5 py-1 capitalize ${
                    STATUS_STYLES[client.status] || STATUS_STYLES.inactive
                  }`}
                >
                  {client.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { Client } from "@/lib/types/database";

type ClientListProps = {
  clients: Client[];
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-[#E4F1EA] text-[#2E7D57]",
  lead: "bg-[#FCE7E7] text-[#C21A1D]",
  inactive: "bg-[#F0F0F1] text-[#5C5C63]",
};

export default function ClientList({ clients }: ClientListProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#E4E4E6] p-12 text-center">
        <h3 className="text-[15px] font-medium mb-1.5">No clients yet</h3>
        <p className="text-[#5C5C63] text-[13.5px]">
          Add your first client to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#E4E4E6] overflow-hidden">
      <table className="min-w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#E4E4E6]">
            {["Client", "Company", "Email", "Phone", "Status"].map((h) => (
              <th
                key={h}
                className="text-left font-normal text-[10px] uppercase tracking-wider text-[#9797A0] px-4 py-3"
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
              className="border-b border-[#E4E4E6] last:border-0 hover:bg-[#F0F0F1] transition-colors"
            >
              <td className="px-4 py-3 font-medium">{client.name}</td>
              <td className="px-4 py-3 text-[#5C5C63]">{client.company || "—"}</td>
              <td className="px-4 py-3 text-[#5C5C63]">{client.email || "—"}</td>
              <td className="px-4 py-3 text-[#5C5C63]">{client.phone || "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 text-[11px] font-medium rounded-full capitalize ${
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

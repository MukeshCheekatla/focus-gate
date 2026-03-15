import { type ApiKey } from "@/lib/api";

interface StatusBadgeProps {
  status: ApiKey["status"];
}

const statusConfig: Record<
  ApiKey["status"],
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  expiring: {
    label: "Expiring Soon",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  expired: {
    label: "Expired",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  rotated: {
    label: "Rotated",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  leaked: {
    label: "Leaked",
    className: "bg-red-100 text-red-800 border-red-300 font-semibold",
  },
};

export function StatusBadge({ status }: StatusBadgeProps): JSX.Element {
  const config = statusConfig[status] ?? {
    label: status,
    className: "bg-slate-50 text-slate-700 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        config.className
      }`}
    >
      {config.label}
    </span>
  );
}

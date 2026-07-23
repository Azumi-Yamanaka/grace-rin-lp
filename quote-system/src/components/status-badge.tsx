import { STATUS_COLORS } from "@/lib/status";

export default function StatusBadge({ status }: { status: string }) {
  const color =
    STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span
      className={`inline-block whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}

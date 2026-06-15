import { statusClass } from "../logic/status";

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${statusClass(status)}`}>
      {status}
    </span>
  );
}

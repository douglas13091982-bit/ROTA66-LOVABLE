import { useEffect, useState } from "react";
import { Timer } from "lucide-react";

type Props = { deadline: string };

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function ColetaDeadlineBadge({ deadline }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(deadline).getTime();
  const diff = target - now;
  const late = diff <= 0;
  const warn = !late && diff <= 2 * 60 * 1000;

  const cls = late
    ? "bg-red-600/90 border-red-300/40 text-white animate-pulse"
    : warn
      ? "bg-orange-500/90 border-orange-300/40 text-white"
      : "bg-emerald-500/90 border-emerald-300/40 text-white";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] rounded-full backdrop-blur-sm border shadow-soft ${cls}`}
      title="Prazo para chegar na coleta"
    >
      <Timer className="h-3 w-3" />
      {late ? "Atrasado" : fmt(diff)}
    </span>
  );
}

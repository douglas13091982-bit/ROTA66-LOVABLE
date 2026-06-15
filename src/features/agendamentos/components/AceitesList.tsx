import { User } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import type { EntregadorAceito } from "../logic/types";

export function AceitesList({
  aceites,
  vagasPreenchidas,
  vagasTotal,
}: {
  aceites: EntregadorAceito[];
  vagasPreenchidas: number;
  vagasTotal: number;
}) {
  if (aceites.length === 0) return null;
  return (
    <div className="space-y-2 bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
        <span>Entregadores confirmados</span>
        <span>
          {vagasPreenchidas} / {vagasTotal} vaga{vagasTotal > 1 ? "s" : ""}
        </span>
      </div>
      <ul className="space-y-1.5">
        {aceites.map((a, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-emerald-200">
            {a.avatar_url ? (
              <AvatarImg
                src={a.avatar_url}
                alt={a.full_name ?? ""}
                className="h-5 w-5 rounded-full object-cover border border-emerald-500/30"
                fallback={<User className="h-3.5 w-3.5" />}
              />
            ) : (
              <User className="h-3.5 w-3.5" />
            )}
            <span className="font-bold">{a.full_name ?? "Entregador"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

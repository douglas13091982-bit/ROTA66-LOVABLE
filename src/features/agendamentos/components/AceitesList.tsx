import { AlertTriangle, CheckCircle2, User } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import type { EntregadorAceito } from "../logic/types";

export function AceitesList({
  aceites,
  vagasPreenchidas,
  vagasTotal,
  turnoConcluido = false,
}: {
  aceites: EntregadorAceito[];
  vagasPreenchidas: number;
  vagasTotal: number;
  turnoConcluido?: boolean;
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
        {aceites.map((a, i) => {
          const pendentes = a.entregas_pendentes ?? 0;
          const finalizadas = a.entregas_finalizadas ?? 0;
          return (
            <li key={i} className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-emerald-200">
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
                <span className="text-[10px] text-emerald-300/70">
                  {finalizadas} finalizada{finalizadas === 1 ? "" : "s"}
                  {pendentes > 0 ? ` · ${pendentes} pendente${pendentes === 1 ? "" : "s"}` : ""}
                </span>
              </div>

              {turnoConcluido && a.horas_pagas && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-300 pl-7">
                  <CheckCircle2 className="h-3 w-3" /> Horas garantidas pagas
                </div>
              )}

              {(pendentes > 0 || (turnoConcluido && a.horas_pagas === false)) && (
                <div className="flex items-start gap-1.5 text-[10px] text-amber-400 pl-7">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>
                    {a.motivo_nao_pagamento ??
                      "Entregas do turno ainda não finalizadas com o código do cliente — as horas garantidas não serão pagas."}
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

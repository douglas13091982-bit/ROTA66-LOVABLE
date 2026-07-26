import { ChevronRight } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { brl, tipoCls } from "../logic/helpers";
import type { TransacaoCredito } from "../logic/types";

type Props = {
  isLoading: boolean;
  transacoes: TransacaoCredito[];
};

export function HistoricoTransacoes({ isLoading, transacoes }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white">Histórico</h3>
        <span className="flex items-center gap-1 text-xs font-semibold text-primary">
          Ver histórico completo
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
      <div className="space-y-2">
        {isLoading && <p className="text-white/50 text-sm">Carregando...</p>}
        {transacoes.map((t) => {
          const valorNum = Number(t.valor);
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.03] text-sm"
            >

              <div className="flex-1 min-w-0">
                <div
                  className={`text-xs uppercase font-bold ${tipoCls[t.tipo] ?? "text-white/60"}`}
                >
                  {t.tipo}
                </div>
                <div className="text-xs text-white/50 truncate">{t.descricao ?? "—"}</div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`font-mono font-bold ${valorNum >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {valorNum >= 0 ? "+" : ""}
                  {brl(t.valor)}
                </div>
                <div className="text-[10px] text-white/40">{formatDateTime(t.created_at)}</div>
              </div>
            </div>
          );
        })}
        {!isLoading && transacoes.length === 0 && (
          <p className="text-white/50 text-sm text-center py-6">Nenhuma transação ainda.</p>
        )}
      </div>
    </div>
  );
}

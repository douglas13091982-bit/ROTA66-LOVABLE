import { formatDateTime } from "@/lib/format";
import { useCreditosTransacoes } from "../hooks/use-creditos-transacoes";
import { brl } from "../logic/format";
import { TIPO_CLS } from "../logic/types";

export function TransacoesTab() {
  const { txQ, nomesQ } = useCreditosTransacoes(true);

  if (txQ.isLoading) return <p className="text-white/50">Carregando...</p>;
  const data = txQ.data ?? [];
  if (data.length === 0) return <p className="text-white/50 text-center py-8">Nenhuma transação.</p>;

  return (
    <div className="space-y-1">
      {data.map((t) => (
        <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02] text-sm">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{nomesQ.data?.[t.entregador_id] ?? t.entregador_id}</div>
            <div className="text-xs text-white/50 truncate">
              <span className={`uppercase font-bold ${TIPO_CLS[t.tipo] ?? ""}`}>{t.tipo}</span>
              {t.descricao ? ` · ${t.descricao}` : ""}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`font-mono font-bold ${Number(t.valor) >= 0 ? "text-green-400" : "text-red-400"}`}>
              {Number(t.valor) >= 0 ? "+" : ""}{brl(t.valor)}
            </div>
            <div className="text-[10px] text-white/40">{formatDateTime(t.created_at)} · saldo {brl(t.saldo_apos)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

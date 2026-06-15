import { useCreditosEntregadores } from "../hooks/use-creditos-entregadores";
import { brl } from "../logic/format";

export function EntregadoresTab() {
  const { data, isLoading, ajustar } = useCreditosEntregadores(true);

  if (isLoading) return <p className="text-white/50">Carregando...</p>;
  if (!data || data.length === 0) return <p className="text-white/50 text-center py-8">Nenhum entregador.</p>;

  return (
    <div className="space-y-2">
      {data.map((e) => (
        <div key={e.entregador_id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{e.full_name ?? "—"}</div>
            <div className="text-xs text-white/50">{e.phone ?? "—"} · {e.status_conta}</div>
          </div>
          <div className={`text-right font-mono ${Number(e.saldo) < 0 ? "text-red-400" : "text-white"}`}>
            <div className="font-bold">{brl(e.saldo)}</div>
            {e.ultima_competencia_cobrada && (
              <div className="text-[10px] text-white/40">Últ. cob. {new Date(e.ultima_competencia_cobrada).toLocaleDateString("pt-BR")}</div>
            )}
          </div>
          <button
            onClick={() => ajustar(e.entregador_id, e.full_name ?? "entregador")}
            className="px-3 py-1.5 text-xs font-bold uppercase rounded-md bg-blue-600/20 text-blue-400 hover:bg-blue-600/30"
          >
            Ajustar
          </button>
        </div>
      ))}
    </div>
  );
}

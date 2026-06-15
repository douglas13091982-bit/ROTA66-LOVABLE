import { Bike } from "lucide-react";
import { useEntregadoresVinculados } from "../hooks/use-entregadores-vinculados";
import { EntregadorCard } from "./EntregadorCard";

export function EntregadoresLista({ lojaId }: { lojaId: string }) {
  const { data, isLoading } = useEntregadoresVinculados(lojaId);
  const onlineCount = data.filter((e) => e.online).length;
  const total = data.length;

  return (
    <div className="pp-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="pp-disc h-9 w-9">
            <Bike className="h-[16px] w-[16px]" />
          </div>
          <div className="min-w-0">
            <div className="pp-eyebrow">Tempo real</div>
            <h3 className="text-[15px] font-semibold text-white tracking-tight mt-0.5 truncate">
              Entregadores vinculados
            </h3>
          </div>
        </div>
        <span className="text-[11px] font-medium text-white/60 flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 tabular-nums">
          <span className="h-1.5 w-1.5 rounded-full pp-dot-online" />
          {onlineCount} / {total} online
        </span>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-sm text-white/50 px-2 py-4">Carregando entregadores…</div>
        ) : data.length === 0 ? (
          <div className="text-sm text-white/50 px-2 py-6 text-center">
            Você ainda não vinculou nenhum entregador a essa loja.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((e) => (
              <EntregadorCard key={e.id} e={e} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

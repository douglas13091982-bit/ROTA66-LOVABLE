import { Bike, Circle, Phone } from "lucide-react";
import { useEntregadoresDaLoja } from "../hooks/use-entregadores";

export function EntregadoresDaLoja({
  lojaId,
  alwaysOpen = false,
}: {
  lojaId: string;
  alwaysOpen?: boolean;
}) {
  const { data, isLoading } = useEntregadoresDaLoja(lojaId, alwaysOpen);

  const total = data?.length ?? 0;
  const onlineCount = (data ?? []).filter((e) => e.ativo && e.online).length;

  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Bike className="h-3 w-3" />
        Entregadores vinculados {data ? `(${onlineCount}/${total} online)` : ""}
      </h3>
      <div className="space-y-1.5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum entregador vinculado.</p>
        ) : (
          data.map((e) => (
            <div
              key={e.vinculo_id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border ${
                e.ativo
                  ? "border-border bg-background"
                  : "border-border/50 bg-background/50 opacity-60"
              }`}
            >
              <Circle
                className={`h-2 w-2 fill-current ${
                  e.ativo && e.online ? "text-emerald-500" : "text-gray-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{e.full_name ?? "Sem nome"}</div>
                {e.phone && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" />
                    {e.phone}
                  </div>
                )}
              </div>
              <span
                className={`text-[9px] font-bold uppercase ${
                  !e.ativo
                    ? "text-muted-foreground"
                    : e.online
                    ? "text-emerald-500"
                    : "text-gray-400"
                }`}
              >
                {!e.ativo ? "Inativo" : e.online ? "Online" : "Offline"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

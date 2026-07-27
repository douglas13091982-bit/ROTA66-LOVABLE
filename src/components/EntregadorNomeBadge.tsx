import { useQuery } from "@tanstack/react-query";
import { Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AvatarImg } from "@/components/AvatarImg";

export function EntregadorNomeBadge({
  pedidoId,
  entregadorId,
  variant = "badge",
  meta,
}: {
  pedidoId: string;
  entregadorId?: string | null;
  /** "row" = linha grande com avatar + nome (card do pedido) */
  variant?: "badge" | "row";
  /** Texto auxiliar exibido no chip da variante "row" (ex.: "Rota · parada 1") */
  meta?: string | null;
}) {
  const { data } = useQuery({
    // Inclui entregadorId na chave para que, quando a loja reenvia o pedido
    // ou outro entregador aceita, o badge refetche em vez de mostrar o antigo.
    queryKey: ["entregador-pedido", pedidoId, entregadorId ?? null],
    enabled: !!pedidoId && !!entregadorId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_entregador_pedido", { _pedido_id: pedidoId });
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });
  if (!data?.full_name) return null;
  const avatar = (data as any).avatar_url as string | null | undefined;

  if (variant === "row") {
    return (
      <div className="mt-2 flex items-center gap-2.5 min-w-0">
        <div className="shrink-0 rounded-full p-[2px] border-2 border-emerald-500/70">
          {avatar ? (
            <AvatarImg
              src={avatar}
              alt={data.full_name}
              className="h-9 w-9 rounded-full object-cover"
              fallback={<Bike className="h-4 w-4" />}
            />
          ) : (
            <div className="h-9 w-9 rounded-full grid place-items-center bg-emerald-500/15 text-emerald-400">
              <Bike className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] leading-tight tracking-wide uppercase">
            {data.full_name}
          </div>
          <div className="mt-1 inline-flex items-center gap-1.5 max-w-full rounded-md bg-foreground/[0.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
            {meta && (
              <>
                <Bike className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{meta}</span>
                <span className="text-border">|</span>
              </>
            )}
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-emerald-500">Entregador</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1 inline-flex items-center gap-1.5 pl-0.5 pr-1.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wider rounded max-w-full">
      {avatar ? (
        <AvatarImg src={avatar} alt={data.full_name} className="h-4 w-4 rounded-full object-cover border border-emerald-500/30" fallback={<Bike className="h-2.5 w-2.5 shrink-0" />} />
      ) : (
        <Bike className="h-2.5 w-2.5 shrink-0" />
      )}
      <span className="truncate">{data.full_name}</span>
    </div>
  );
}



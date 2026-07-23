import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { useAuth } from "@/hooks/use-auth";

/**
 * Hook GLOBAL: mantém um mapa { pedido_id -> qtd não lidas } para o usuário
 * atual, alimentado por UM ÚNICO canal Realtime de `pedido_mensagens`.
 *
 * Substitui a antiga abordagem de abrir 1 canal por card (que estourava o
 * limite de canais do Supabase Realtime e atrasava entrega de eventos).
 *
 * Deve ser montado uma única vez por shell (LojaShell / EntregadorShell).
 */
export function useChatNaoLidasGlobal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;

  const query = useQuery({
    queryKey: ["chat-nao-lidas-map", userId],
    enabled: !!userId,
    staleTime: 10_000,
    refetchInterval: 60_000, // fallback caso o canal caia
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedido_mensagens" as any)
        .select("pedido_id")
        .is("lida_em", null)
        .neq("sender_id", userId!);
      if (error) return {} as Record<string, number>;
      const map: Record<string, number> = {};
      for (const row of ((data ?? []) as unknown) as Array<{ pedido_id: string }>) {
        map[row.pedido_id] = (map[row.pedido_id] ?? 0) + 1;
      }
      return map;
    },
  });

  useEffect(() => {
    if (!userId) return;
    return subscribeLazy(() =>
      supabase
        .channel(`chat-nao-lidas-global-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "pedido_mensagens" },
          () => {
            qc.invalidateQueries({ queryKey: ["chat-nao-lidas-map", userId] });
          }
        )
        .subscribe() as never,
    );
  }, [userId, qc]);

  return query;
}

/** Lê do cache global (sem disparar nada): quantas não-lidas tem este pedido. */
export function useChatNaoLidasPorPedido(pedidoId: string): number {
  const { user } = useAuth();
  const { data } = useQuery<Record<string, number>>({
    queryKey: ["chat-nao-lidas-map", user?.id],
    enabled: false, // só leitura — o provider global é quem alimenta
  });
  return data?.[pedidoId] ?? 0;
}

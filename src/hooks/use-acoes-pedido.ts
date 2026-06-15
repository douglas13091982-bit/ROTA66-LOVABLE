/**
 * Hook com as ações de aceitar/recusar um grupo de pedidos.
 * Encapsula a complexidade dos 3 caminhos:
 *   1. Pedidos externos → RPC `aceitar_pedido_externo`
 *   2. Rota agrupada vinculada → UPDATE em lote com rota_id e codigo_coleta
 *   3. Pedido único vinculado → UPDATE direto
 */

import { useCallback, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { pararNotificacao } from "@/lib/notificacao-som";
import { haversineKm, type LatLng } from "@/lib/geo";
import type { PedidoDisponivel } from "@/types/pedido";

const DISMISSED_KEY = "entregador:rotas-recusadas";

function loadDismissed(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
}

function novoCodigoColeta(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function novoRotaId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function ordenarPorProximidadeColeta(items: PedidoDisponivel[]): PedidoDisponivel[] {
  const coletaRef: LatLng | null =
    items[0]?.endereco_coleta_lat != null && items[0]?.endereco_coleta_lng != null
      ? {
          lat: Number(items[0].endereco_coleta_lat),
          lng: Number(items[0].endereco_coleta_lng),
        }
      : null;

  return [...items].sort((a, b) => {
    const aLat = a.endereco_entrega_lat != null ? Number(a.endereco_entrega_lat) : null;
    const aLng = a.endereco_entrega_lng != null ? Number(a.endereco_entrega_lng) : null;
    const bLat = b.endereco_entrega_lat != null ? Number(b.endereco_entrega_lat) : null;
    const bLng = b.endereco_entrega_lng != null ? Number(b.endereco_entrega_lng) : null;

    if (!coletaRef) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    const aHas = aLat != null && aLng != null;
    const bHas = bLat != null && bLng != null;
    if (!aHas && !bHas) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (!aHas) return 1;
    if (!bHas) return -1;
    return (
      haversineKm(coletaRef, { lat: aLat as number, lng: aLng as number }) -
      haversineKm(coletaRef, { lat: bLat as number, lng: bLng as number })
    );
  });
}

async function unificarLoteColeta(
  pedidoIdsOrdenados: string[],
  rotaId?: string | null,
  codigoColeta?: string | null,
): Promise<string | null> {
  const { error } = await (
    supabase.rpc as unknown as (
      fn: string,
      args: {
        _pedido_ids: string[];
        _rota_id?: string | null;
        _codigo_coleta?: string | null;
      },
    ) => Promise<{ error: Error | null }>
  )("unificar_lote_coleta", {
    _pedido_ids: pedidoIdsOrdenados,
    _rota_id: rotaId ?? null,
    _codigo_coleta: codigoColeta ?? null,
  });
  return error?.message ?? null;
}

async function aceitarPedidosExternos(items: PedidoDisponivel[]): Promise<string | null> {
  const sorted = ordenarPorProximidadeColeta(items);
  for (const p of sorted) {
    const { error } = await (
      supabase.rpc as unknown as (
        fn: string,
        args: { _pedido_id: string },
      ) => Promise<{ error: Error | null }>
    )("aceitar_pedido_externo", { _pedido_id: p.id });
    if (error) return error.message;
  }

  // Unifica rota_id + codigo_coleta em uma única chamada SECURITY DEFINER
  // (o guard bloqueia UPDATE direto em codigo_coleta após o aceite).
  // Pedidos JÁ aceitos — roda em segundo plano para não atrasar nem bloquear
  // o redirecionamento para a página de rotas ativas.
  const rotaIdExistente = sorted.find((p) => p.rota_id)?.rota_id ?? null;
  const codigoExistente = sorted.find((p) => p.codigo_coleta)?.codigo_coleta ?? null;
  void unificarLoteColeta(
    sorted.map((p) => p.id),
    rotaIdExistente,
    codigoExistente,
  ).then((erroUnif) => {
    if (erroUnif) {
      console.error("Falha ao unificar lote de coleta (não fatal):", erroUnif);
    }
  });
  return null;
}

async function aceitarRotaVinculada(
  items: PedidoDisponivel[],
  entregadorId: string,
): Promise<string | null> {
  const rotaIdCompartilhado =
    items.find((p) => p.rota_id)?.rota_id ?? novoRotaId();
  const codigoColetaCompartilhado =
    items.find((p) => p.codigo_coleta)?.codigo_coleta ?? novoCodigoColeta();

  const coletaRef: LatLng | null =
    items[0]?.endereco_coleta_lat != null && items[0]?.endereco_coleta_lng != null
      ? {
          lat: Number(items[0].endereco_coleta_lat),
          lng: Number(items[0].endereco_coleta_lng),
        }
      : null;

  const sorted = [...items].sort((a, b) => {
    const aLat = a.endereco_entrega_lat != null ? Number(a.endereco_entrega_lat) : null;
    const aLng = a.endereco_entrega_lng != null ? Number(a.endereco_entrega_lng) : null;
    const bLat = b.endereco_entrega_lat != null ? Number(b.endereco_entrega_lat) : null;
    const bLng = b.endereco_entrega_lng != null ? Number(b.endereco_entrega_lng) : null;

    if (!coletaRef) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }

    const aHasCoords = aLat != null && aLng != null;
    const bHasCoords = bLat != null && bLng != null;

    if (!aHasCoords && !bHasCoords) {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (!aHasCoords) return 1;
    if (!bHasCoords) return -1;

    const distA = haversineKm(coletaRef, { lat: aLat, lng: aLng });
    const distB = haversineKm(coletaRef, { lat: bLat, lng: bLng });
    return distA - distB;
  });

  // UPDATE atômico no aceite (guard permite definir codigo_coleta neste instante).
  const results = await Promise.all(
    sorted.map((p, idx) =>
      supabase
        .from("pedidos")
        .update({
          status: "em_rota" as const,
          entregador_id: entregadorId,
          codigo_coleta: codigoColetaCompartilhado,
          rota_id: rotaIdCompartilhado,
          rota_ordem: idx + 1,
        })
        .eq("id", p.id)
        .is("entregador_id", null),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) return failed.error.message;

  // Garante consistência caso algum UPDATE não tenha propagado o código.
  // Pedidos já aceitos — falha aqui não é fatal (não bloqueia a navegação).
  void unificarLoteColeta(
    sorted.map((p) => p.id),
    rotaIdCompartilhado,
    codigoColetaCompartilhado,
  ).then((erroUnif) => {
    if (erroUnif) {
      console.error("Falha ao unificar lote de coleta (não fatal):", erroUnif);
    }
  });
  return null;
}

async function aceitarPedidoUnico(
  items: PedidoDisponivel[],
  entregadorId: string,
): Promise<string | null> {
  const { error } = await supabase
    .from("pedidos")
    .update({ status: "em_rota", entregador_id: entregadorId })
    .in(
      "id",
      items.map((p) => p.id),
    )
    .is("entregador_id", null);
  return error?.message ?? null;
}

export function useAcoesPedido() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [dismissed, setDismissed] = useState<string[]>(() => loadDismissed());

  const dismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = Array.from(new Set([...prev, key]));
      try {
        sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const invalidarQueries = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["pedidos-disponiveis"] });
    qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", user?.id] });
    qc.invalidateQueries({ queryKey: ["pedidos-ativos", user?.id] });
  }, [qc, user?.id]);

  const aceitarGrupo = useCallback(
    async (items: PedidoDisponivel[]) => {
      pararNotificacao();
      if (!user?.id) {
        toast.error("Sessão expirada");
        return;
      }
      const ehExterno = items.every((p) => p._externo);

      let erro: string | null;
      if (ehExterno) {
        erro = await aceitarPedidosExternos(items);
        if (!erro) {
          toast.success(
            items.length > 1
              ? `Rota com ${items.length} pedidos aceita!`
              : "Pedido aceito! Boa rota.",
          );
        }
      } else if (items.length > 1) {
        erro = await aceitarRotaVinculada(items, user.id);
        if (!erro) toast.success(`Rota com ${items.length} pedidos aceita!`);
      } else {
        erro = await aceitarPedidoUnico(items, user.id);
        if (!erro) toast.success("Pedido aceito! Boa rota.");
      }

      if (erro) {
        toast.error(erro);
        qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", user.id] });
        return;
      }

      // Navega PRIMEIRO via router.navigate (independente do ciclo de vida do
      // componente que disparou o aceite). Só então invalida as queries, para
      // que o re-render aconteça já na página de destino.
      await router.navigate({
        to: "/entregador/ativos",
        search: { destaque: items[0].id },
        replace: true,
      });
      invalidarQueries();
    },
    [user?.id, qc, router, invalidarQueries],
  );

  const recusarGrupo = useCallback(
    (key: string, items: PedidoDisponivel[]) => {
      pararNotificacao();
      dismiss(key);
      toast.info(items.length > 1 ? "Rota recusada" : "Pedido recusado");
    },
    [dismiss],
  );

  return { dismissed, aceitarGrupo, recusarGrupo };
}

/**
 * Hook: calcula taxa de entrega automaticamente quando as coordenadas mudam.
 *
 * Modelo:
 *   taxa_entrega (paga pelo cliente) = tarifa_global_por_km + taxa_por_pedido_loja
 *
 * O entregador recebe apenas a tarifa global (frete). A taxa por pedido do
 * plano fica retida com a loja para repassar ao sistema.
 */


import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm, type LatLng } from "@/lib/geo";
import { calcularTarifaPorFaixa, encontrarFaixa } from "@/lib/tarifa-calculator";
import type { TarifaFaixa } from "@/types/pedido";

type Coords = { lat: number | null; lng: number | null };

async function buscarTarifasPorVeiculo(): Promise<Map<string, TarifaFaixa[]>> {
  const { data } = await supabase
    .from("tarifas_globais")
    .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km, tipo_veiculo")
    .eq("ativa", true)
    .order("faixa_km_min", { ascending: true });
  const map = new Map<string, TarifaFaixa[]>();
  for (const row of (data ?? []) as any[]) {
    const tv = String(row.tipo_veiculo ?? "moto");
    const arr = map.get(tv) ?? [];
    arr.push(row as TarifaFaixa);
    map.set(tv, arr);
  }
  return map;
}

async function buscarTaxaPlanoLoja(
  lojaId: string,
): Promise<{ taxa: number; planoMensalAtivo: boolean }> {
  if (!lojaId) return { taxa: 0, planoMensalAtivo: false };
  // Tenta primeiro a view pública (acessível a anônimos no catálogo)
  let data: any = null;
  const pub = await (supabase as any)
    .from("lojas_publicas")
    .select("taxa_por_pedido, plano_mensal_ativo")
    .eq("id", lojaId)
    .maybeSingle();
  data = pub.data;
  if (!data) {
    const r = await supabase
      .from("lojas")
      .select("taxa_por_pedido, plano_mensal_ativo")
      .eq("id", lojaId)
      .maybeSingle();
    data = r.data;
  }
  return {
    taxa: Number((data as any)?.taxa_por_pedido ?? 0) || 0,
    planoMensalAtivo: Boolean((data as any)?.plano_mensal_ativo),
  };
}

function coordsValidas(c: Coords): c is LatLng {
  return c.lat != null && c.lng != null;
}

export function useTarifaEntrega(
  lojaId: string,
  coleta: Coords,
  entrega: Coords,
) {
  const [taxa, setTaxa] = useState<number>(0);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (!coordsValidas(coleta) || !coordsValidas(entrega)) {
      setTaxa(0);
      setInfo(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const km = haversineKm(coleta, entrega);
      const [tarifasPorVeiculo, plano] = await Promise.all([
        buscarTarifasPorVeiculo(),
        buscarTaxaPlanoLoja(lojaId),
      ]);
      if (cancelled) return;
      if (tarifasPorVeiculo.size === 0) {
        setTaxa(0);
        setInfo(null);
        return;
      }

      // Cliente paga o MAIOR frete entre os tipos de veículo ativos, para
      // sempre cobrir o repasse do entregador (independente de moto/carro).
      let valorGlobal: number | null = null;
      let tarifasBase: TarifaFaixa[] = [];
      for (const [, tarifas] of tarifasPorVeiculo) {
        const v = calcularTarifaPorFaixa(km, tarifas);
        if (v == null) continue;
        if (valorGlobal == null || v > valorGlobal) {
          valorGlobal = v;
          tarifasBase = tarifas;
        }
      }
      if (valorGlobal == null) {
        setTaxa(0);
        setInfo(null);
        return;
      }

      const taxaPlano = plano.taxa;
      const total = Number((valorGlobal + taxaPlano).toFixed(2));
      const faixa = encontrarFaixa(km, tarifasBase);
      setTaxa(total);
      if (faixa) {
        const sufixoPlano =
          taxaPlano > 0
            ? ` + R$ ${taxaPlano.toFixed(2)} da taxa por pedido da loja`
            : "";
        setInfo(
          `${km.toFixed(1)} km · faixa ${faixa.faixa_km_min}–${faixa.faixa_km_max} km · frete R$ ${valorGlobal.toFixed(2)}${sufixoPlano}`,
        );
      }


    })();
    return () => {
      cancelled = true;
    };
  }, [lojaId, coleta.lat, coleta.lng, entrega.lat, entrega.lng]);

  return { taxa, info, setTaxa };
}

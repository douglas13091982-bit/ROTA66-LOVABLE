import { reverseGeocode } from "./frete.functions";
import { createServerFn } from "@tanstack/react-start";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { mapboxCalcularDistancia } from "./mapbox.functions";

type LatLng = { lat: number; lng: number };

function haversineKm(p1: LatLng, p2: LatLng) {
  const R = 6371;
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


type SupaClient = SupabaseClient<Database>;

// Defaults caso a tabela de config esteja vazia ou indisponível
const DEFAULT_CONFIG = {
  max_detour_seconds: 15 * 60,
  max_detour_meters: 3000,
  max_paradas_por_rota: 6,
  max_paradas_por_rota_carro: 12,
  entregador_online_ttl_min: 10,
};

async function loadConfig(supabase: SupaClient) {
  const { data } = await supabase
    .from("config_roteirizacao")
    .select(
      "max_detour_seconds, max_detour_meters, max_paradas_por_rota, max_paradas_por_rota_carro, entregador_online_ttl_min",
    )
    .limit(1)
    .maybeSingle();
  const anyData = data as any;
  return {
    max_detour_seconds: data?.max_detour_seconds ?? DEFAULT_CONFIG.max_detour_seconds,
    max_detour_meters: data?.max_detour_meters ?? DEFAULT_CONFIG.max_detour_meters,
    max_paradas_por_rota: data?.max_paradas_por_rota ?? DEFAULT_CONFIG.max_paradas_por_rota,
    max_paradas_por_rota_carro:
      anyData?.max_paradas_por_rota_carro ?? DEFAULT_CONFIG.max_paradas_por_rota_carro,
    entregador_online_ttl_min:
      data?.entregador_online_ttl_min ?? DEFAULT_CONFIG.entregador_online_ttl_min,
  };
}

type PedidoMin = {
  id: string;
  loja_id: string;
  status: string;
  entregador_id: string | null;
  rota_id: string | null;
  rota_ordem: number | null;
  endereco_coleta_lat: number | null;
  endereco_coleta_lng: number | null;
  endereco_entrega_lat: number | null;
  endereco_entrega_lng: number | null;
  created_at: string;
};

async function pickEntregador(
  supabase: SupaClient,
  lojaId: string,
  pickup: LatLng | null,
  ttlMin: number,
): Promise<{
  entregadorId: string;
  duracaoAteColeta: number | null;
  distanciaAteColeta: number | null;
} | null> {
  const since = new Date(Date.now() - ttlMin * 60_000).toISOString();

  // Vínculos ativos da loja
  const { data: vinculos } = await supabase
    .from("loja_entregadores")
    .select("entregador_id")
    .eq("loja_id", lojaId)
    .eq("ativo", true);
  const ids = (vinculos ?? []).map((v) => v.entregador_id).filter(Boolean);
  if (ids.length === 0) return null;

  // Status online
  const { data: statuses } = await supabase
    .from("entregador_status")
    .select("entregador_id, lat, lng, updated_at, online")
    .in("entregador_id", ids)
    .eq("online", true)
    .gte("updated_at", since);
  const online = (statuses ?? []).filter(
    (s) => s.entregador_id && s.lat != null && s.lng != null,
  );
  if (online.length === 0) {
    // fallback: pega qualquer vinculado, sem cálculo de tempo
    return { entregadorId: ids[0]!, duracaoAteColeta: null, distanciaAteColeta: null };
  }

  // Carga atual (em_rota / coletado)
  const { data: cargas } = await supabase
    .from("pedidos")
    .select("entregador_id")
    .in("entregador_id", online.map((o) => o.entregador_id!))
    .in("status", ["em_rota", "coletado"]);
  const cargaMap = new Map<string, number>();
  for (const c of cargas ?? []) {
    if (!c.entregador_id) continue;
    cargaMap.set(c.entregador_id, (cargaMap.get(c.entregador_id) ?? 0) + 1);
  }

  // Sem coleta georef, ranqueia por menor carga
  if (!pickup) {
    online.sort(
      (a, b) =>
        (cargaMap.get(a.entregador_id!) ?? 0) -
        (cargaMap.get(b.entregador_id!) ?? 0),
    );
    return {
      entregadorId: online[0]!.entregador_id!,
      duracaoAteColeta: null,
      distanciaAteColeta: null,
    };
  }

  // Routes API: tempo de cada entregador até a coleta
  const origins: LatLng[] = online.map((o) => ({
    lat: Number(o.lat),
    lng: Number(o.lng),
  }));
  // Mapbox Directions: calculamos sequencialmente ou via fallback (Mapbox Matrix é outro endpoint, simplificamos aqui)
  const matrix = null as any; 


  type Score = {
    entregadorId: string;
    duracao: number | null;
    distancia: number | null;
    carga: number;
  };
  const scores: Score[] = online.map((o, i) => {
    const cell = matrix?.find((c: any) => c.originIndex === i && c.destinationIndex === 0);
    return {
      entregadorId: o.entregador_id!,
      duracao: cell?.ok ? cell.durationSeconds : null,
      distancia: cell?.ok ? cell.distanceMeters : null,
      carga: cargaMap.get(o.entregador_id!) ?? 0,
    };
  });

  // Fallback se matriz falhou: haversine
  if (!matrix) {
    for (const s of scores) {
      const entregador = online.find((o) => o.entregador_id === s.entregadorId)!;
      s.distancia =
        haversineKm(
          { lat: Number(entregador.lat), lng: Number(entregador.lng) },
          pickup,
        ) * 1000;
      s.duracao = (s.distancia! / 1000 / 30) * 3600; // 30km/h chute
    }
  }

  scores.sort((a, b) => {
    if (a.carga !== b.carga) return a.carga - b.carga;
    return (a.duracao ?? Infinity) - (b.duracao ?? Infinity);
  });
  const best = scores[0];
  if (!best) return null;
  return {
    entregadorId: best.entregadorId,
    duracaoAteColeta: best.duracao,
    distanciaAteColeta: best.distancia,
  };
}


export const atribuirPedido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { pedidoId: string }) =>
    z.object({ pedidoId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { pedidoId } = data;
    const cfg = await loadConfig(supabase);


    const { data: ped, error: pedErr } = await supabase
      .from("pedidos")
      .select(
        "id, loja_id, status, entregador_id, rota_id, rota_ordem, endereco_coleta_lat, endereco_coleta_lng, endereco_entrega_lat, endereco_entrega_lng, created_at",
      )
      .eq("id", pedidoId)
      .maybeSingle();
    if (pedErr) throw new Error(pedErr.message);
    if (!ped) throw new Error("Pedido não encontrado");
    const pedido = ped as PedidoMin;
    if (pedido.status !== "pronto" || pedido.entregador_id) {
      return { ok: false, reason: "Pedido não está disponível para atribuição" };
    }

    const destino: LatLng | null =
      pedido.endereco_entrega_lat != null && pedido.endereco_entrega_lng != null
        ? {
            lat: Number(pedido.endereco_entrega_lat),
            lng: Number(pedido.endereco_entrega_lng),
          }
        : null;
    const coleta: LatLng | null =
      pedido.endereco_coleta_lat != null && pedido.endereco_coleta_lng != null
        ? {
            lat: Number(pedido.endereco_coleta_lat),
            lng: Number(pedido.endereco_coleta_lng),
          }
        : null;

    // 1. Tenta agrupar em rotas ativas da mesma loja
    let rotaEscolhida: {
      rotaId: string;
      entregadorId: string;
      proximaOrdem: number;
      duracao: number | null;
      distancia: number | null;
    } | null = null;

    if (destino) {
      const { data: ativos } = await supabase
        .from("pedidos")
        .select(
          "id, loja_id, status, entregador_id, rota_id, rota_ordem, endereco_entrega_lat, endereco_entrega_lng",
        )
        .eq("loja_id", pedido.loja_id)
        .not("rota_id", "is", null)
        .not("entregador_id", "is", null)
        .in("status", ["em_rota", "coletado"]);

      const rotas = new Map<string, PedidoMin[]>();
      for (const a of (ativos ?? []) as PedidoMin[]) {
        if (!a.rota_id) continue;
        const arr = rotas.get(a.rota_id) ?? [];
        arr.push(a);
        rotas.set(a.rota_id, arr);
      }

      // Carrega tipo_veiculo dos entregadores responsáveis pelas rotas ativas
      const entregadorIds = Array.from(
        new Set(
          Array.from(rotas.values())
            .map((paradas) => paradas[0]?.entregador_id)
            .filter((v): v is string => !!v),
        ),
      );
      const tipoMap = new Map<string, "moto" | "carro">();
      if (entregadorIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, tipo_veiculo")
          .in("id", entregadorIds);
        for (const p of (profs ?? []) as any[]) {
          tipoMap.set(p.id, (p.tipo_veiculo as "moto" | "carro") ?? "moto");
        }
      }

      type Candidate = {
        rotaId: string;
        entregadorId: string;
        proximaOrdem: number;
        duracao: number;
        distancia: number;
      };
      const candidatos: Candidate[] = [];

      for (const [rotaId, paradas] of rotas) {
        const entregadorId = paradas[0]!.entregador_id!;
        const tipo = tipoMap.get(entregadorId) ?? "moto";
        const limiteParadas =
          tipo === "carro" ? cfg.max_paradas_por_rota_carro : cfg.max_paradas_por_rota;
        if (paradas.length >= limiteParadas) continue;
        const origens = paradas
          .filter(
            (p) =>
              p.endereco_entrega_lat != null && p.endereco_entrega_lng != null,
          )
          .map<LatLng>((p) => ({
            lat: Number(p.endereco_entrega_lat),
            lng: Number(p.endereco_entrega_lng),
          }));
        if (origens.length === 0) continue;

        const matrix = null as any;
        let melhorDur = Infinity;
        let melhorDist = Infinity;
        if (matrix) {
          for (const c of matrix) {
            if (!c.ok) continue;
            if (c.durationSeconds < melhorDur) melhorDur = c.durationSeconds;
            if (c.distanceMeters < melhorDist) melhorDist = c.distanceMeters;
          }
        } else {
          // fallback haversine
          for (const o of origens) {
            const km = haversineKm(o, destino);
            const m = km * 1000;
            const dur = (km / 30) * 3600;
            if (dur < melhorDur) melhorDur = dur;
            if (m < melhorDist) melhorDist = m;
          }
        }

        if (
          melhorDur <= cfg.max_detour_seconds ||
          melhorDist <= cfg.max_detour_meters
        ) {
          const proximaOrdem =
            Math.max(...paradas.map((p) => p.rota_ordem ?? 0)) + 1;
          candidatos.push({
            rotaId,
            entregadorId,
            proximaOrdem,
            duracao: melhorDur,
            distancia: melhorDist,
          });
        }
      }

      candidatos.sort((a, b) => a.duracao - b.duracao);
      if (candidatos[0]) {
        const c = candidatos[0];
        rotaEscolhida = {
          rotaId: c.rotaId,
          entregadorId: c.entregadorId,
          proximaOrdem: c.proximaOrdem,
          duracao: c.duracao,
          distancia: c.distancia,
        };
      }
    }

    // 2. Senão, deixa o pedido no pool aberto — qualquer entregador elegível
    //    pode aceitar pela tela "Disponíveis". Não atribui automaticamente.
    if (!rotaEscolhida) {
      // Mantém referência para evitar warning de variável não usada (pickEntregador
      // segue exportada/disponível para uso futuro de roteirização avançada).
      void pickEntregador;
      void coleta;
      return { ok: false, reason: "pool_aberto" };
    }

    const etaAt =
      rotaEscolhida.duracao != null
        ? new Date(Date.now() + rotaEscolhida.duracao * 1000).toISOString()
        : null;

    const { error: updErr } = await supabase
      .from("pedidos")
      .update({
        status: "em_rota",
        entregador_id: rotaEscolhida.entregadorId,
        rota_id: rotaEscolhida.rotaId,
        rota_ordem: rotaEscolhida.proximaOrdem,
        atribuido_automaticamente: true,
        duracao_estimada_seg: rotaEscolhida.duracao
          ? Math.round(rotaEscolhida.duracao)
          : null,
        distancia_metros: rotaEscolhida.distancia
          ? Math.round(rotaEscolhida.distancia)
          : null,
        eta_chegada_at: etaAt,
      })
      .eq("id", pedidoId)
      .eq("status", "pronto");
    if (updErr) throw new Error(updErr.message);

    return {
      ok: true,
      rotaId: rotaEscolhida.rotaId,
      entregadorId: rotaEscolhida.entregadorId,
      duracaoSeg: rotaEscolhida.duracao,
      distanciaMetros: rotaEscolhida.distancia,
      etaAt,
    };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";

/**
 * Fluxo exclusivo "Motoboy avulso ROTA 66":
 * cliente informa endereço de coleta + entrega + destinatário, paga online (Pix/Cartão),
 * e só depois o pedido é despachado direto ao pool de entregadores (status 'pronto').
 * Não há itens/produtos — é uma corrida avulsa.
 */

// Slug de identificação — apenas a loja ROTA 66 aceita este fluxo.
const LOJA_NOME_TARGET = "ROTA 66";

const InputSchema = z.object({
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_telefone: z.string().trim().min(8).max(20),
  cliente_email: z.string().trim().email().max(200),
  cliente_doc: z.string().trim().min(11).max(20),

  destinatario_nome: z.string().trim().min(2).max(120),
  destinatario_telefone: z.string().trim().min(8).max(20),

  endereco_coleta: z.string().trim().min(5).max(300),
  endereco_coleta_lat: z.number().min(-90).max(90),
  endereco_coleta_lng: z.number().min(-180).max(180),

  endereco_entrega: z.string().trim().min(5).max(300),
  endereco_entrega_lat: z.number().min(-90).max(90),
  endereco_entrega_lng: z.number().min(-180).max(180),

  complemento: z.string().trim().max(200).optional().nullable(),
  observacoes: z.string().trim().max(500).optional().nullable(),

  forma_pagamento: z.enum(["pix_online", "cartao_online"]),
});

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export const carregarLojaMotoboyAvulso = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lojas")
    .select("id, nome, endereco, endereco_lat, endereco_lng, ativa, status")
    .ilike("nome", LOJA_NOME_TARGET)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || !data.ativa || data.status !== "aprovado") {
    throw new Error("Serviço indisponível no momento.");
  }
  return {
    loja_id: data.id as string,
    nome: data.nome as string,
  };
});

export const criarPendenteMotoboyAvulso = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: loja, error: lojaErr } = await supabaseAdmin
      .from("lojas")
      .select("id, nome, ativa, status, taxa_por_pedido")
      .ilike("nome", LOJA_NOME_TARGET)
      .maybeSingle();
    if (lojaErr) throw new Error(lojaErr.message);
    if (!loja || !loja.ativa || loja.status !== "aprovado") {
      throw new Error("Serviço indisponível no momento.");
    }

    // Frete = tarifa global (moto) por faixa + taxa_por_pedido da loja
    const km = haversineKm(
      data.endereco_coleta_lat,
      data.endereco_coleta_lng,
      data.endereco_entrega_lat,
      data.endereco_entrega_lng,
    );

    const { data: tarifas } = await supabaseAdmin
      .from("tarifas_globais")
      .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
      .eq("ativa", true)
      .eq("tipo_veiculo", "moto")
      .order("faixa_km_min", { ascending: true });

    const frete = calcularTarifaPorFaixa(km, tarifas ?? []);
    if (frete == null) throw new Error("Não foi possível calcular o frete.");

    const taxaPlano = Number((loja as any).taxa_por_pedido ?? 0) || 0;
    const taxa_entrega = Number((frete + taxaPlano).toFixed(2));
    const valor_total = taxa_entrega; // sem produtos

    const observ = [
      `[MOTOBOY AVULSO]`,
      `Destinatário: ${data.destinatario_nome} — ${data.destinatario_telefone}`,
      data.observacoes ? `Obs: ${data.observacoes}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const snapshot = {
      avulso_motoboy: true,
      cliente_nome: data.cliente_nome,
      cliente_telefone: data.cliente_telefone,
      cliente_email: data.cliente_email,
      cliente_doc: data.cliente_doc,
      destinatario_nome: data.destinatario_nome,
      destinatario_telefone: data.destinatario_telefone,
      endereco_entrega: data.endereco_entrega,
      endereco_entrega_lat: data.endereco_entrega_lat,
      endereco_entrega_lng: data.endereco_entrega_lng,
      complemento: data.complemento ?? null,
      endereco_coleta: data.endereco_coleta,
      endereco_coleta_lat: data.endereco_coleta_lat,
      endereco_coleta_lng: data.endereco_coleta_lng,
      observacoes: observ,
      forma_pagamento: data.forma_pagamento,
      troco_para: null,
      itens: [] as any[],
      valor_produtos: 0,
      taxa_entrega,
      valor_total,
      km: Number(km.toFixed(2)),
    };

    const { data: pend, error: pendErr } = await supabaseAdmin
      .from("pedidos_pendentes_pagamento" as any)
      .insert({
        loja_id: loja.id,
        forma_pagamento: data.forma_pagamento,
        valor_total,
        dados: snapshot as any,
        status: "aguardando",
      } as any)
      .select("id")
      .single();
    if (pendErr) throw new Error(pendErr.message);

    return {
      pendente_id: (pend as any).id as string,
      loja_id: loja.id as string,
      valor_total,
      taxa_entrega,
      km: Number(km.toFixed(2)),
    };
  });

export const calcularFreteMotoboyAvulso = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        coleta_lat: z.number(),
        coleta_lng: z.number(),
        entrega_lat: z.number(),
        entrega_lng: z.number(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: loja } = await supabaseAdmin
      .from("lojas")
      .select("taxa_por_pedido")
      .ilike("nome", LOJA_NOME_TARGET)
      .maybeSingle();
    const km = haversineKm(data.coleta_lat, data.coleta_lng, data.entrega_lat, data.entrega_lng);
    const { data: tarifas } = await supabaseAdmin
      .from("tarifas_globais")
      .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
      .eq("ativa", true)
      .eq("tipo_veiculo", "moto")
      .order("faixa_km_min", { ascending: true });
    const frete = calcularTarifaPorFaixa(km, tarifas ?? []);
    if (frete == null) return { km: Number(km.toFixed(2)), taxa_entrega: 0, frete: 0, taxa_loja: 0 };
    const taxaPlano = Number((loja as any)?.taxa_por_pedido ?? 0) || 0;
    return {
      km: Number(km.toFixed(2)),
      frete: Number(frete.toFixed(2)),
      taxa_loja: taxaPlano,
      taxa_entrega: Number((frete + taxaPlano).toFixed(2)),
    };
  });

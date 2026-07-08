import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calcularTarifaPorFaixa } from "@/lib/tarifa-calculator";

const ItemSchema = z.object({
  produto_id: z.string().uuid(),
  qtd: z.number().int().min(1).max(99),
});

const InputSchema = z.object({
  loja_slug: z.string().min(1).max(120),
  cliente_nome: z.string().trim().min(2).max(120),
  cliente_telefone: z.string().trim().min(8).max(20),
  endereco_entrega: z.string().trim().min(5).max(300),
  endereco_entrega_lat: z.number().min(-90).max(90).nullable().optional(),
  endereco_entrega_lng: z.number().min(-180).max(180).nullable().optional(),
  complemento: z.string().trim().max(200).optional().nullable(),
  cidade: z.string().trim().max(120).optional().nullable(),
  observacoes: z.string().trim().max(500).optional().nullable(),
  forma_pagamento: z.enum(["pix", "dinheiro", "cartao", "cartao_credito", "cartao_debito", "pix_online", "cartao_online"]),
  troco_para: z.number().nullable().optional(),
  itens: z.array(ItemSchema).min(1).max(50),
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

export const criarPedidoCatalogo = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Loja precisa estar ativa, aprovada e com catálogo ativo
    const lojaCols = "id, nome, ativa, status, catalogo_ativo, taxa_entrega_base, endereco, endereco_lat, endereco_lng, plano_mensal_ativo, taxa_por_pedido";
    let { data: loja, error: lojaErr } = await supabaseAdmin
      .from("lojas")
      .select(lojaCols)
      .eq("catalogo_slug", data.loja_slug)
      .maybeSingle();
    if (lojaErr) throw new Error(lojaErr.message);
    if (!loja) {
      const r = await supabaseAdmin
        .from("lojas")
        .select(lojaCols)
        .eq("slug", data.loja_slug)
        .maybeSingle();
      if (r.error) throw new Error(r.error.message);
      loja = r.data;
    }
    if (!loja) throw new Error("Loja não encontrada");
    if (!loja.ativa || loja.status !== "aprovado" || !(loja as any).catalogo_ativo) {
      throw new Error("Catálogo desta loja não está disponível");
    }

    // 2. Buscar produtos no servidor (preços confiáveis)
    const ids = Array.from(new Set(data.itens.map((i) => i.produto_id)));
    const { data: produtos, error: prodErr } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, preco, ativo, loja_id")
      .in("id", ids);
    if (prodErr) throw new Error(prodErr.message);

    const map = new Map((produtos ?? []).map((p) => [p.id, p]));
    let valor_produtos = 0;
    const itensSnapshot: Array<{ produto_id: string; nome: string; preco: number; qtd: number; subtotal: number }> = [];

    for (const it of data.itens) {
      const p = map.get(it.produto_id) as any;
      if (!p || !p.ativo || p.loja_id !== loja.id) {
        throw new Error("Produto inválido ou indisponível");
      }
      const preco = Number(p.preco);
      const subtotal = preco * it.qtd;
      valor_produtos += subtotal;
      itensSnapshot.push({ produto_id: p.id, nome: p.nome, preco, qtd: it.qtd, subtotal });
    }

    // 3. Calcular taxa de entrega
    const coletaLat = (loja as any).endereco_lat as number | null;
    const coletaLng = (loja as any).endereco_lng as number | null;
    const entregaLat = data.endereco_entrega_lat ?? null;
    const entregaLng = data.endereco_entrega_lng ?? null;

    let taxa_entrega = Number(loja.taxa_entrega_base) || 0;
    if (coletaLat != null && coletaLng != null && entregaLat != null && entregaLng != null) {
      const km = haversineKm(coletaLat, coletaLng, entregaLat, entregaLng);
      const { data: tarifas } = await supabaseAdmin
        .from("tarifas_globais")
        .select("faixa_km_min, faixa_km_max, valor, valor_minimo, valor_por_km")
        .eq("ativa", true)
        .eq("tipo_veiculo", "moto")
        .order("faixa_km_min", { ascending: true });
      const calc = calcularTarifaPorFaixa(km, tarifas ?? []);
      if (calc != null) taxa_entrega = Number(calc.toFixed(2));
    }
    const taxaPlano = Number((loja as any).taxa_por_pedido ?? 0) || 0;
    if (taxaPlano > 0) {
      taxa_entrega = Number((taxa_entrega + taxaPlano).toFixed(2));
    }
    const valor_total = valor_produtos + taxa_entrega;

    const isOnline = data.forma_pagamento === "pix_online" || data.forma_pagamento === "cartao_online";

    // 4a. Pagamento ONLINE: NÃO cria pedido ainda. Cria apenas snapshot pendente.
    if (isOnline) {
      const snapshot = {
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone,
        endereco_entrega: data.endereco_entrega,
        endereco_entrega_lat: entregaLat,
        endereco_entrega_lng: entregaLng,
        complemento: data.complemento ?? null,
        cidade: data.cidade ?? null,
        endereco_coleta: loja.endereco ?? null,
        endereco_coleta_lat: coletaLat,
        endereco_coleta_lng: coletaLng,
        observacoes: data.observacoes ?? null,
        forma_pagamento: data.forma_pagamento,
        troco_para: null,
        itens: itensSnapshot,
        valor_produtos,
        taxa_entrega,
        valor_total,
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
        aguardando_pagamento: true as const,
        pendente_id: (pend as any).id as string,
        valor_total,
        // legado: id/numero ficam null até o pagamento confirmar
        id: null,
        numero: null,
      };
    }

    // 4b. Pagamento OFFLINE (pix/dinheiro): cria pedido direto em em_preparo.
    const { data: pedido, error: insErr } = await supabaseAdmin
      .from("pedidos")
      .insert({
        loja_id: loja.id,
        cliente_user_id: null,
        cliente_nome: data.cliente_nome,
        cliente_telefone: data.cliente_telefone,
        endereco_entrega: data.endereco_entrega,
        endereco_entrega_lat: entregaLat,
        endereco_entrega_lng: entregaLng,
        complemento: data.complemento ?? null,
        cidade: data.cidade ?? null,
        endereco_coleta: loja.endereco ?? null,
        endereco_coleta_lat: coletaLat,
        endereco_coleta_lng: coletaLng,
        observacoes: data.observacoes ?? null,
        forma_pagamento: data.forma_pagamento,
        troco_para: data.forma_pagamento === "dinheiro" ? data.troco_para ?? null : null,
        itens: itensSnapshot as any,
        valor_produtos,
        taxa_entrega,
        valor_total,
        status: "em_preparo",
      })
      .select("id, numero")
      .single();
    if (insErr) throw new Error(insErr.message);

    return {
      aguardando_pagamento: false as const,
      id: pedido.id,
      numero: pedido.numero,
      pendente_id: null,
      valor_total,
    };
  });

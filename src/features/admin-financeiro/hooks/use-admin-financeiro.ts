import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Cobranca, ConfigFinanceiro, Mensalidade } from "../logic/types";

export function useAdminFinanceiro() {
  const [config, setConfig] = useState<ConfigFinanceiro>({
    taxa: 2,
    prazo: 30,
    mensalidadePadrao: 0,
    diaVenc: 10,
    pixChave: "",
    pixTitular: "",
    pixCidade: "",
  });
  const [configId, setConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);

  async function carregar() {
    setLoading(true);
    const { data: cfg } = await supabase
      .from("config_financeiro")
      .select("*")
      .eq("singleton", true)
      .maybeSingle();
    if (cfg) {
      setConfigId(cfg.id);
      setConfig({
        taxa: Number(cfg.taxa_por_pedido),
        prazo: Number(cfg.prazo_pagamento_dias),
        mensalidadePadrao: Number(cfg.mensalidade_valor_padrao ?? 0),
        diaVenc: Number(cfg.dia_vencimento_padrao ?? 10),
        pixChave: (cfg as any).pix_chave_sistema ?? "",
        pixTitular: (cfg as any).pix_titular_sistema ?? "",
        pixCidade: (cfg as any).pix_cidade_sistema ?? "",
      });
    }
    const [{ data: cob }, { data: mens }] = await Promise.all([
      supabase.from("cobrancas_loja").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("mensalidades_loja").select("*").order("competencia", { ascending: false }).limit(200),
    ]);
    const ids = Array.from(
      new Set([...(cob ?? []).map((c) => c.loja_id), ...(mens ?? []).map((m) => m.loja_id)])
    );
    let lojaMap: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: lojas } = await supabase.from("lojas").select("id, nome").in("id", ids);
      lojaMap = Object.fromEntries((lojas ?? []).map((l: any) => [l.id, l.nome]));
    }
    setCobrancas((cob ?? []).map((c: any) => ({ ...c, loja_nome: lojaMap[c.loja_id] })));
    setMensalidades((mens ?? []).map((m: any) => ({ ...m, loja_nome: lojaMap[m.loja_id] })));
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel("admin-financeiro-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cobrancas_loja" },
        (payload) => {
          carregar();
          const novo: any = payload.new;
          const antigo: any = payload.old;
          if (
            payload.eventType === "UPDATE" &&
            novo?.pago_solicitado_em &&
            !novo?.pago &&
            antigo?.pago_solicitado_em !== novo?.pago_solicitado_em
          ) {
            toast.info(`Uma loja avisou o pagamento de uma taxa (R$ ${Number(novo.valor).toFixed(2)})`);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mensalidades_loja" },
        (payload) => {
          carregar();
          const novo: any = payload.new;
          const antigo: any = payload.old;
          if (
            payload.eventType === "UPDATE" &&
            novo?.pago_solicitado_em &&
            !novo?.pago &&
            antigo?.pago_solicitado_em !== novo?.pago_solicitado_em
          ) {
            toast.info(`Uma loja avisou o pagamento de uma mensalidade (R$ ${Number(novo.valor).toFixed(2)})`);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar() {
    setSaving(true);
    const payload = {
      taxa_por_pedido: config.taxa,
      prazo_pagamento_dias: config.prazo,
      mensalidade_valor_padrao: config.mensalidadePadrao,
      dia_vencimento_padrao: Math.min(Math.max(config.diaVenc, 1), 28),
      pix_chave_sistema: config.pixChave.trim() || null,
      pix_titular_sistema: config.pixTitular.trim() || null,
      pix_cidade_sistema: config.pixCidade.trim() || null,
      singleton: true,
    };
    const q = configId
      ? supabase.from("config_financeiro").update(payload).eq("id", configId)
      : supabase.from("config_financeiro").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
    carregar();
  }

  async function gerarMensalidades() {
    setGerando(true);
    const { data, error } = await supabase.rpc("gerar_mensalidades_mes");
    setGerando(false);
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} mensalidade(s) geradas para este mês`);
    carregar();
  }

  async function quitarCobrancasLoja(lojaId: string) {
    const { error } = await supabase
      .from("cobrancas_loja")
      .update({ pago: true, pago_em: new Date().toISOString() })
      .eq("loja_id", lojaId)
      .eq("pago", false);
    if (error) return toast.error(error.message);
    toast.success("Cobranças quitadas");
    carregar();
  }

  async function marcarCobrancaPaga(id: string) {
    const { error } = await supabase
      .from("cobrancas_loja")
      .update({ pago: true, pago_em: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Cobrança quitada");
    carregar();
  }

  async function marcarMensalidadePaga(id: string) {
    const { error } = await supabase
      .from("mensalidades_loja")
      .update({ pago: true, pago_em: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Mensalidade quitada");
    carregar();
  }

  async function quitarVarias(
    tabela: "cobrancas_loja" | "mensalidades_loja",
    ids: string[]
  ) {
    if (ids.length === 0) return;
    const { error } = await supabase
      .from(tabela)
      .update({ pago: true, pago_em: new Date().toISOString() })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} pagamento(s) confirmado(s)`);
    carregar();
  }

  return {
    config,
    setConfig,
    saving,
    gerando,
    loading,
    cobrancas,
    mensalidades,
    salvar,
    gerarMensalidades,
    quitarCobrancasLoja,
    marcarCobrancaPaga,
    marcarMensalidadePaga,
    quitarVarias,
  };
}

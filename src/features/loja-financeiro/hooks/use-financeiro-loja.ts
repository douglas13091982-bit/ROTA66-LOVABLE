import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Cobranca, Mensalidade, PixCfg } from "../logic/types";

export function useFinanceiroLoja(loja: any | null | undefined) {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [prazo, setPrazo] = useState<number>(30);
  const [mensalidadeValor, setMensalidadeValor] = useState<number>(0);
  const [pixCfg, setPixCfg] = useState<PixCfg>({
    pix_chave_sistema: null,
    pix_titular_sistema: null,
    pix_cidade_sistema: null,
  });

  const carregar = useCallback(async () => {
    if (!loja?.id) return;
    setLoading(true);
    const [{ data: cfg }, { data: cob }, { data: mens }] = await Promise.all([
      (supabase as any).rpc("get_pix_sistema").then((r: any) => ({ data: r.data?.[0] ?? null })),
      supabase
        .from("cobrancas_loja")
        .select("*")
        .eq("loja_id", loja.id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("mensalidades_loja")
        .select("*")
        .eq("loja_id", loja.id)
        .order("competencia", { ascending: false })
        .limit(60),
    ]);
    if (cfg) {
      setPrazo(Number((cfg as any).prazo_pagamento_dias));
      setPixCfg({
        pix_chave_sistema: (cfg as any).pix_chave_sistema ?? null,
        pix_titular_sistema: (cfg as any).pix_titular_sistema ?? null,
        pix_cidade_sistema: (cfg as any).pix_cidade_sistema ?? null,
      });
    }
    const lj: any = loja;
    const valor =
      lj.mensalidade_valor != null
        ? Number(lj.mensalidade_valor)
        : Number((cfg as any)?.mensalidade_valor_padrao ?? 0);
    setMensalidadeValor(valor);
    setCobrancas((cob as Cobranca[]) ?? []);
    setMensalidades((mens as Mensalidade[]) ?? []);
    setLoading(false);
  }, [loja]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const marcarSolicitado = useCallback(
    async (tabela: "cobrancas_loja" | "mensalidades_loja", ids: string[]) => {
      const { error } = await supabase
        .from(tabela)
        .update({ pago_solicitado_em: new Date().toISOString() })
        .in("id", ids);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Pagamento informado ao admin");
      await carregar();
    },
    [carregar],
  );

  return {
    cobrancas,
    mensalidades,
    loading,
    prazo,
    mensalidadeValor,
    pixCfg,
    carregar,
    marcarSolicitado,
  };
}

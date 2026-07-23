import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import {
  criarRecargaPixLoja,
  consultarStatusRecargaLoja,
} from "@/lib/loja-saldo.functions";

export type LojaSaldoMov = {
  id: string;
  tipo: "recarga" | "debito_pedido" | "ajuste_admin" | "estorno";
  valor: number;
  saldo_apos: number;
  pedido_id: string | null;
  descricao: string | null;
  created_at: string;
};

export type RecargaLojaState = {
  recargaId: string;
  qrCode: string | null;
  qrCodeBase64: string | null;
  valor: number;
  status: "pending" | "approved";
};

export function useSaldoLoja(lojaId: string | null | undefined) {
  const qc = useQueryClient();

  const saldoQ = useQuery({
    queryKey: ["loja-saldo", lojaId],
    enabled: !!lojaId,
    queryFn: async (): Promise<{ saldo: number; updated_at: string | null }> => {
      const { data } = await supabase
        .from("lojas_saldo" as any)
        .select("saldo, updated_at")
        .eq("loja_id", lojaId!)
        .maybeSingle();
      const row = data as any;
      return { saldo: Number(row?.saldo ?? 0), updated_at: row?.updated_at ?? null };
    },
  });

  const movsQ = useQuery({
    queryKey: ["loja-saldo-movs", lojaId],
    enabled: !!lojaId,
    queryFn: async (): Promise<LojaSaldoMov[]> => {
      const { data } = await supabase
        .from("lojas_saldo_movimentos" as any)
        .select("id, tipo, valor, saldo_apos, pedido_id, descricao, created_at")
        .eq("loja_id", lojaId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as unknown as LojaSaldoMov[];
    },
  });

  const criar = useServerFn(criarRecargaPixLoja);
  const consultar = useServerFn(consultarStatusRecargaLoja);

  const [recarga, setRecarga] = useState<RecargaLojaState | null>(null);
  const [criando, setCriando] = useState(false);
  const [valor, setValor] = useState<string>("100");

  const gerarPix = async () => {
    if (!lojaId) return;
    const v = Number(String(valor).replace(",", "."));
    if (!Number.isFinite(v) || v < 5) {
      toast.error("Valor mínimo: R$ 5,00");
      return;
    }
    setCriando(true);
    try {
      const r: any = await criar({ data: { lojaId, valor: v } });
      setRecarga({ ...r, status: "pending" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PIX");
    } finally {
      setCriando(false);
    }
  };

  useEffect(() => {
    if (!recarga || recarga.status === "approved") return;
    const interval = setInterval(async () => {
      try {
        const r: any = await consultar({ data: { recargaId: recarga.recargaId } });
        if (r.status === "approved" || r.creditado) {
          setRecarga((cur) => (cur ? { ...cur, status: "approved" } : cur));
          toast.success("Recarga confirmada! Saldo atualizado.");
          qc.invalidateQueries({ queryKey: ["loja-saldo", lojaId] });
          qc.invalidateQueries({ queryKey: ["loja-saldo-movs", lojaId] });
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [recarga, consultar, qc, lojaId]);

  // Realtime: atualiza saldo e movimentos automaticamente (ex: débito ao entregar pedido)
  useEffect(() => {
    if (!lojaId) return;
    return subscribeLazy(() =>
      supabase
        .channel(`loja-saldo-${lojaId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "lojas_saldo", filter: `loja_id=eq.${lojaId}` },
          () => {
            qc.invalidateQueries({ queryKey: ["loja-saldo", lojaId] });
          },
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "lojas_saldo_movimentos", filter: `loja_id=eq.${lojaId}` },
          () => {
            qc.invalidateQueries({ queryKey: ["loja-saldo-movs", lojaId] });
            qc.invalidateQueries({ queryKey: ["loja-saldo", lojaId] });
          },
        )
        .subscribe()
    );
  }, [lojaId, qc]);

  return {
    saldoQ,
    movsQ,
    recarga,
    setRecarga,
    criando,
    valor,
    setValor,
    gerarPix,
  };
}

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  criarRecargaPix,
  consultarStatusRecarga,
} from "@/lib/creditos-entregador.functions";
import type { RecargaPixState } from "../logic/types";

export function usePixRecarga() {
  const qc = useQueryClient();
  const criar = useServerFn(criarRecargaPix);
  const consultar = useServerFn(consultarStatusRecarga);

  const [recarga, setRecarga] = useState<RecargaPixState | null>(null);
  const [criando, setCriando] = useState(false);
  const [copied, setCopied] = useState(false);

  const gerarPix = async () => {
    setCriando(true);
    try {
      const r = await criar({ data: {} as any });
      setRecarga({ ...(r as any), status: "pending" });
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
          toast.success("Pagamento confirmado! Saldo atualizado.");
          qc.invalidateQueries({ queryKey: ["entregador-saldo"] });
          qc.invalidateQueries({ queryKey: ["entregador-transacoes"] });
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [recarga, consultar, qc]);

  const copiar = async () => {
    if (!recarga?.qrCode) return;
    await navigator.clipboard.writeText(recarga.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return {
    recarga,
    setRecarga,
    criando,
    copied,
    gerarPix,
    copiar,
  };
}

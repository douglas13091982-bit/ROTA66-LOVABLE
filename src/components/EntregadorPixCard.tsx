import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Bike, Copy, Check, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { gerarPixBrCode } from "@/lib/pix-brcode";
import { AvatarImg } from "@/components/AvatarImg";

interface Props {
  pedidoId: string;
  valor?: number;
  entregaPaga?: boolean;
  entregaPagaEm?: string | null;
  onPagoChange?: (pago: boolean) => void;
}

export function EntregadorPixCard({ pedidoId, valor, entregaPaga, entregaPagaEm, onPagoChange }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["entregador-pedido", pedidoId],
    enabled: !!pedidoId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_entregador_pedido", { _pedido_id: pedidoId });
      if (error) throw error;
      return Array.isArray(data) && data.length > 0 ? data[0] : null;
    },
  });

  // Gera o payload Pix "Copia e Cola" (BR Code) com o valor da entrega embutido.
  const brCode = useMemo(() => {
    if (!data?.pix_chave) return null;
    return gerarPixBrCode({
      chave: data.pix_chave,
      valor: valor != null ? Number(valor) : null,
      recebedor: data.full_name ?? "ENTREGADOR",
      cidade: "BRASIL",
      txid: `PED${pedidoId.replace(/-/g, "").slice(0, 20)}`,
    });
  }, [data?.pix_chave, data?.full_name, valor, pedidoId]);

  useEffect(() => {
    if (!brCode) { setQrDataUrl(null); return; }
    QRCode.toDataURL(brCode, { width: 240, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [brCode]);

  if (isLoading) return null;
  if (!data) return null;

  const copyPix = async () => {
    if (!brCode) return;
    try {
      await navigator.clipboard.writeText(brCode);
      setCopied(true);
      toast.success("Pix Copia e Cola copiado");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Entregador</div>
      <div className="border border-border rounded-md p-3 bg-background space-y-3">
        <div className="flex items-center gap-3">
          {(data as any).avatar_url ? (
            <AvatarImg
              src={(data as any).avatar_url}
              alt={data.full_name ?? "Entregador"}
              className="h-12 w-12 rounded-full object-cover border-2 border-indigo-500/40 shrink-0"
              fallback={
                <div className="h-12 w-12 rounded-full bg-indigo-500/15 border-2 border-indigo-500/40 flex items-center justify-center shrink-0">
                  <Bike className="h-5 w-5 text-indigo-500" />
                </div>
              }
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-indigo-500/15 border-2 border-indigo-500/40 flex items-center justify-center shrink-0">
              <Bike className="h-5 w-5 text-indigo-500" />
            </div>
          )}
          <span className="font-medium">{data.full_name ?? "—"}</span>
        </div>
        {data.phone && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /> {data.phone}
          </div>
        )}

        {!data.pix_chave && (
          <p className="text-xs text-muted-foreground italic">
            O entregador ainda não cadastrou uma chave PIX.
          </p>
        )}

        {data.pix_chave && (
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            {qrDataUrl && (
              <img src={qrDataUrl} alt="QR Code PIX" className="rounded border border-border bg-white p-1 w-32 h-32 shrink-0" />
            )}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chave PIX</div>
              <div className="text-xs font-mono break-all bg-muted/40 rounded px-2 py-1.5 border border-border">
                {data.pix_chave}
              </div>
              {valor != null && (
                <div className="text-xs">
                  Valor a pagar: <span className="font-bold text-primary">R$ {Number(valor).toFixed(2)}</span>
                </div>
              )}
              <button
                type="button"
                onClick={copyPix}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary text-primary-foreground hover:opacity-90"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copiado" : "Copiar Pix Copia e Cola"}
              </button>
              <p className="text-[10px] text-muted-foreground leading-snug">
                O QR Code e o código já vêm com o valor da entrega — basta abrir o app do banco e pagar.
              </p>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3 mt-1">
          {entregaPaga ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
              <Check className="h-4 w-4" />
              Entrega paga{entregaPagaEm ? ` em ${new Date(entregaPagaEm).toLocaleString("pt-BR")}` : ""}
            </div>
          ) : (
            <button
              type="button"
              onClick={async () => {
                const { error } = await supabase
                  .from("pedidos")
                  .update({ entrega_paga: true, entrega_paga_em: new Date().toISOString() })
                  .eq("id", pedidoId);
                if (error) { toast.error(error.message); return; }
                toast.success("Entregador notificado do pagamento");
                onPagoChange?.(true);
              }}
              className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold uppercase text-xs tracking-wider rounded-md"
            >
              Marcar entrega como paga
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

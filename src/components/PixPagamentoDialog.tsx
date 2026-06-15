import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { gerarPixBrCode } from "@/lib/pix-brcode";

interface Props {
  open: boolean;
  onClose: () => void;
  titulo: string;
  descricao?: string;
  valor: number;
  chavePix: string | null;
  titular?: string | null;
  cidade?: string | null;
  txid?: string;
  onMarcarPago?: () => Promise<void> | void;
  marcarLabel?: string;
}

export function PixPagamentoDialog({
  open,
  onClose,
  titulo,
  descricao,
  valor,
  chavePix,
  titular,
  cidade,
  txid,
  onMarcarPago,
  marcarLabel,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [marcando, setMarcando] = useState(false);

  const brCode = useMemo(() => {
    if (!chavePix || !valor) return null;
    return gerarPixBrCode({
      chave: chavePix,
      valor,
      recebedor: titular ?? "SISTEMA",
      cidade: cidade ?? "BRASIL",
      txid: txid ?? "***",
    });
  }, [chavePix, valor, titular, cidade, txid]);

  useEffect(() => {
    if (!brCode || !open) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(brCode, { width: 260, margin: 1, errorCorrectionLevel: "M" })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [brCode, open]);

  if (!open) return null;

  const copiar = async () => {
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-lg shadow-card w-full max-w-md max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display text-xl tracking-wide">{titulo}</h3>
            {descricao && <p className="text-xs text-muted-foreground mt-1">{descricao}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!chavePix ? (
            <div className="text-sm text-muted-foreground bg-background border border-border rounded-md p-4">
              O super admin ainda não cadastrou a chave PIX do sistema. Peça a ele para configurar
              em <strong>Admin → Financeiro</strong>.
            </div>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code PIX"
                    className="rounded border border-border bg-white p-2 w-56 h-56"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center border border-border rounded bg-background">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="text-center">
                  <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">Valor</div>
                  <div className="font-display text-3xl text-primary">R$ {valor.toFixed(2)}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Chave PIX</div>
                <div className="text-xs font-mono break-all bg-background rounded px-3 py-2 border border-border">
                  {chavePix}
                </div>
                {titular && (
                  <div className="text-xs text-muted-foreground">
                    Titular: <strong className="text-foreground">{titular}</strong>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={copiar}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wider rounded bg-primary text-primary-foreground hover:opacity-90"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar Pix Copia e Cola"}
              </button>

              <p className="text-[11px] text-muted-foreground leading-snug text-center">
                Escaneie o QR Code no app do seu banco ou cole o código. O valor já vai embutido.
              </p>

              {onMarcarPago && (
                <button
                  type="button"
                  disabled={marcando}
                  onClick={async () => {
                    setMarcando(true);
                    try {
                      await onMarcarPago();
                      onClose();
                    } finally {
                      setMarcando(false);
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold uppercase tracking-wider rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                >
                  {marcando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {marcarLabel ?? "Já paguei — avisar admin"}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

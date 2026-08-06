import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Loader2, QrCode, CreditCard, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import {
  consolidarMensalidade,
  gerarPagamentoMensalidade,
  consultarStatusMensalidade,
} from "@/lib/mensalidades-mp.functions";

type Props = {
  open: boolean;
  onClose: () => void;
  lojaId: string;
  mensalidadeId: string | null;
  defaultEmail?: string;
  defaultNome?: string;
  defaultDoc?: string;
  onPago?: () => void;
};

type Resultado =
  | { metodo: "pix"; qr_code: string; qr_code_base64: string; ticket_url: string; expira_em: string; valor: number }
  | { metodo: "cartao"; init_point: string; valor: number };

export function PagamentoMpMensalidadeDialog({
  open,
  onClose,
  lojaId,
  mensalidadeId,
  defaultEmail,
  defaultNome,
  defaultDoc,
  onPago,
}: Props) {
  const consolidar = useServerFn(consolidarMensalidade);
  const gerar = useServerFn(gerarPagamentoMensalidade);
  const consultar = useServerFn(consultarStatusMensalidade);

  const [metodo, setMetodo] = useState<"pix" | "cartao">("pix");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [nome, setNome] = useState(defaultNome ?? "");
  const [doc, setDoc] = useState(defaultDoc ?? "");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [mensId, setMensId] = useState<string | null>(mensalidadeId);

  useEffect(() => {
    if (!open) {
      setResultado(null);
      setMensId(mensalidadeId);
    }
  }, [open, mensalidadeId]);

  // Se não tem mensalidade ainda, consolida do mês atual
  const mConsolidar = useMutation({
    mutationFn: () => consolidar({ data: { loja_id: lojaId } }),
    onSuccess: (r) => setMensId(r.mensalidade_id),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao consolidar"),
  });

  useEffect(() => {
    if (open && !mensId) mConsolidar.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mGerar = useMutation({
    mutationFn: () =>
      gerar({
        data: {
          mensalidade_id: mensId!,
          metodo,
          payer_email: email,
          payer_nome: nome || undefined,
          payer_doc: doc || undefined,
        },
      }),
    onSuccess: (r: any) => {
      setResultado(r);
      if (r.metodo === "cartao" && r.init_point) window.open(r.init_point, "_blank", "noopener");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha"),
  });

  // Polling de status quando o resultado existe
  const status = useQuery({
    queryKey: ["mens-mp-status", mensId, resultado?.metodo],
    enabled: !!mensId && !!resultado,
    refetchInterval: 5000,
    queryFn: () => consultar({ data: { mensalidade_id: mensId! } }),
  });
  useEffect(() => {
    if (status.data?.pago) {
      toast.success("Pagamento confirmado!");
      onPago?.();
    }
  }, [status.data?.pago, onPago]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-xl max-w-md w-full max-h-[95vh] flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
          <h3 className="font-display text-lg">Pagar mensalidade</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {!mensId || mConsolidar.isPending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando mensalidade…
            </div>
          ) : status.data?.pago ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="font-bold">Pagamento confirmado!</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md"
              >
                Fechar
              </button>
            </div>
          ) : !resultado ? (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setMetodo("pix")}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    metodo === "pix" 
                      ? "bg-[#AE0000]/10 border-[#AE0000] text-[#AE0000]" 
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <QrCode className="h-4 w-4" /> PIX
                </button>
                <button
                  onClick={() => setMetodo("cartao")}
                  className={`flex-1 px-3 py-2 rounded-md border text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${
                    metodo === "cartao" 
                      ? "bg-[#AE0000]/10 border-[#AE0000] text-[#AE0000]" 
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> Cartão
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                    E-mail do pagador *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-[#AE0000] outline-none"
                  />
                </div>

                {metodo === "pix" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        Nome do pagador
                      </label>
                      <input
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-[#AE0000] outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                        CPF ou CNPJ
                      </label>
                      <input
                        value={doc}
                        onChange={(e) => setDoc(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:ring-1 focus:ring-[#AE0000] outline-none"
                      />
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => mGerar.mutate()}
                disabled={!email || mGerar.isPending}
                className="w-full px-4 py-3 bg-[#AE0000] text-white font-bold uppercase text-sm tracking-widest rounded-md hover:bg-[#8e0000] disabled:opacity-50 flex items-center justify-center gap-2 mt-2 transition-all shadow-md"
              >
                {mGerar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {metodo === "pix" ? "Gerar QR Code PIX" : "Pagar com cartão"}
              </button>
            </>
          ) : resultado.metodo === "pix" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Valor: <strong className="text-foreground">R$ {resultado.valor.toFixed(2)}</strong>
              </p>
              {resultado.qr_code_base64 && (
                <img
                  src={`data:image/png;base64,${resultado.qr_code_base64}`}
                  alt="QR Code"
                  className="mx-auto bg-white p-2 rounded-md"
                  width={240}
                  height={240}
                />
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-muted-foreground">PIX copia e cola</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={resultado.qr_code}
                    className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-xs font-mono"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resultado.qr_code);
                      toast.success("Copiado");
                    }}
                    className="px-3 py-1.5 bg-card border border-border rounded text-xs font-bold"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
                <Loader2 className="h-3 w-3 animate-spin" /> Aguardando confirmação automática…
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm">
                Você foi redirecionado para o Checkout do Mercado Pago em uma nova aba.
              </p>
              <a
                href={resultado.init_point}
                target="_blank"
                rel="noopener"
                className="block text-center px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md"
              >
                Abrir checkout
              </a>
              <p className="text-xs text-muted-foreground flex items-center gap-2 justify-center">
                <Loader2 className="h-3 w-3 animate-spin" /> Aguardando confirmação…
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

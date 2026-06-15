import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { EntregadorShell } from "@/components/EntregadorShell";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Copy, Check, AlertTriangle, Loader2, Calendar, CheckCircle2, Clock } from "lucide-react";
import { criarRecargaPix, consultarStatusRecarga } from "@/lib/creditos-entregador.functions";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/entregador/carteira")({
  component: EntregadorCarteira,
});

const brl = (n: number | string | null | undefined) => formatCurrency(Number(n ?? 0));

function EntregadorCarteira() {
  const qc = useQueryClient();
  const criar = useServerFn(criarRecargaPix);
  const consultar = useServerFn(consultarStatusRecarga);

  const saldoQ = useQuery({
    queryKey: ["entregador-saldo"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("entregador_saldo_atual" as any);
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  const cfgQ = useQuery({
    queryKey: ["entregador-config-creditos"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_config_creditos_entregador" as any);
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  const txQ = useQuery({
    queryKey: ["entregador-transacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("entregador_creditos_transacoes" as any)
        .select("id, tipo, valor, saldo_apos, descricao, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
  });

  const [recarga, setRecarga] = useState<null | {
    recargaId: string;
    qrCode: string | null;
    qrCodeBase64: string | null;
    valor: number;
    status: string;
  }>(null);
  const [criando, setCriando] = useState(false);
  const [copied, setCopied] = useState(false);

  const gerarPix = async () => {
    setCriando(true);
    try {
      const r = await criar({ data: {} as any });
      setRecarga({ ...r, status: "pending" });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar PIX");
    } finally {
      setCriando(false);
    }
  };

  // Polling
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

  const s = saldoQ.data;
  const bloqueado = s?.bloqueado;
  const mpOk = cfgQ.data?.mp_configurado;
  const featureAtiva = cfgQ.data?.ativo;

  const tipoCls: Record<string, string> = {
    recarga: "text-green-400",
    mensalidade: "text-amber-400",
    ajuste_manual: "text-blue-400",
    estorno: "text-purple-400",
  };

  const mensalidadePaga = s?.mensalidade_paga === true;
  const vencimentoDate = s?.data_vencimento_atual ? new Date(s.data_vencimento_atual) : null;

  return (
    <EntregadorShell title="Carteira">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Passe mensal */}
        {featureAtiva ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 text-white/50 text-xs uppercase tracking-wider">
                <Calendar className="h-3.5 w-3.5" /> Passe mensal
              </div>
              {mensalidadePaga ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-green-300 border border-green-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Pago
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300 border border-amber-500/20">
                  <Clock className="h-3 w-3" /> Pendente
                </span>
              )}
            </div>

            <div className="text-4xl font-bold text-white">
              {saldoQ.isLoading ? "..." : brl(s?.mensalidade_valor)}
            </div>
            <div className="text-xs text-white/40 mt-1">
              Vencimento {vencimentoDate ? vencimentoDate.toLocaleDateString("pt-BR") : `dia ${s?.dia_vencimento ?? "—"}`}
              {mensalidadePaga ? " · mensalidade já quitada para este mês" : " · pague para manter o acesso"}
            </div>

            {!mpOk && (
              <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                Pagamento indisponível: Mercado Pago do sistema ainda não foi configurado pelo administrador.
              </div>
            )}

            {!recarga && Number(s?.mensalidade_valor ?? 0) > 0 && !mensalidadePaga && (
              <button
                onClick={gerarPix}
                disabled={criando || !mpOk}
                className="mt-4 w-full py-3 rounded-md font-bold uppercase tracking-wider text-sm disabled:opacity-40 inline-flex items-center justify-center gap-2 text-white border"
                style={{ background: "linear-gradient(135deg, oklch(0.55 0.16 155), oklch(0.42 0.14 155))", borderColor: "oklch(0.6 0.18 155 / 0.55)" }}
              >
                {criando && <Loader2 className="h-4 w-4 animate-spin" />}
                Pagar agora
              </button>
            )}

            {!recarga && Number(s?.mensalidade_valor ?? 0) <= 0 && (
              <div className="mt-4 text-xs text-white/50 text-center py-2">
                Mensalidade ainda não foi definida pelo administrador.
              </div>
            )}

            {recarga && (
              <div className="space-y-3 mt-4">
                <div className="text-center">
                  <div className="text-xs text-white/50 uppercase tracking-wider">Valor</div>
                  <div className="text-2xl font-bold text-white">{brl(recarga.valor)}</div>
                </div>

                {recarga.status === "approved" ? (
                  <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4 text-center">
                    <Check className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <div className="font-bold text-green-200">Pagamento confirmado!</div>
                    <button
                      onClick={() => setRecarga(null)}
                      className="mt-3 px-4 py-1.5 rounded-md bg-white text-black text-xs font-bold uppercase"
                    >
                      Fechar
                    </button>
                  </div>
                ) : (
                  <>
                    {recarga.qrCodeBase64 && (
                      <div className="bg-white p-3 rounded-md flex justify-center">
                        <img
                          src={`data:image/png;base64,${recarga.qrCodeBase64}`}
                          alt="QR Code PIX"
                          className="max-w-[240px]"
                        />
                      </div>
                    )}
                    {recarga.qrCode && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1">
                          Pix copia e cola
                        </label>
                        <div className="flex gap-2">
                          <input
                            readOnly
                            value={recarga.qrCode}
                            className="flex-1 px-3 py-2 rounded-md bg-black/40 border border-white/10 text-white text-xs font-mono truncate"
                          />
                          <button
                            onClick={copiar}
                            className="px-3 py-2 rounded-md bg-white text-black font-bold text-xs uppercase inline-flex items-center gap-1"
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied ? "OK" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-white/50 text-center inline-flex items-center justify-center gap-2 w-full">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Aguardando pagamento...
                    </div>
                    <button
                      onClick={() => setRecarga(null)}
                      className="w-full py-2 rounded-md border border-white/10 text-white/60 text-xs uppercase hover:bg-white/5"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
            A cobrança de mensalidade está desativada no momento. Você pode operar normalmente.
          </div>
        )}

        {bloqueado && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-sm text-red-200">
              <div className="font-bold">Você está bloqueado de receber novas ofertas</div>
              <div className="text-xs mt-1 text-red-200/80">
                Pague a mensalidade para voltar a receber ofertas.
              </div>
            </div>
          </div>
        )}


        {/* Histórico */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/60 mb-2">Histórico</h3>
          <div className="space-y-1">
            {txQ.isLoading && <p className="text-white/50 text-sm">Carregando...</p>}
            {(txQ.data ?? []).map((t: any) => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02] text-sm">
                <div className="flex-1 min-w-0">
                  <div className={`text-xs uppercase font-bold ${tipoCls[t.tipo] ?? "text-white/60"}`}>{t.tipo}</div>
                  <div className="text-xs text-white/50 truncate">{t.descricao ?? "—"}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`font-mono font-bold ${Number(t.valor) >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {Number(t.valor) >= 0 ? "+" : ""}{brl(t.valor)}
                  </div>
                  <div className="text-[10px] text-white/40">{formatDateTime(t.created_at)}</div>
                </div>
              </div>
            ))}
            {!txQ.isLoading && (txQ.data ?? []).length === 0 && (
              <p className="text-white/50 text-sm text-center py-6">Nenhuma transação ainda.</p>
            )}
          </div>
        </div>
      </div>
    </EntregadorShell>
  );
}

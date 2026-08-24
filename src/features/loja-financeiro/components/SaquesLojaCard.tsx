import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Wallet, Send, CheckCircle2, XCircle, Clock, Save, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSaquesLoja, type SaqueLojaRow } from "../hooks/use-saques-loja";
import { formatCurrency } from "@/lib/format/currency";
import { i18nConfig } from "@/lib/i18n-config";
import { formatDate } from "@/lib/format";

const brl = (v: number) => formatCurrency(v);

function StatusBadge({ status }: { status: SaqueLojaRow["status"] }) {
  if (status === 'pago') return null;
  const map: Record<string, { cls: string; label: string; icon: any }> = {
    solicitado: { cls: "bg-yellow-500/15 text-yellow-600", label: "Pendente", icon: Clock },
    rejeitado: { cls: "bg-destructive/15 text-destructive", label: "Rejeitado", icon: XCircle },
    cancelado: { cls: "bg-muted text-muted-foreground", label: "Cancelado", icon: XCircle },
  };
  const c = map[status] ?? map.solicitado;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${c.cls}`}>
       {c.label}
    </span>
  );
}

export function SaquesLojaCard({ lojaId }: { lojaId: string }) {
  const qc = useQueryClient();
  const { resumoQ, saquesQ, solicitarM } = useSaquesLoja(lojaId);
  const resumo = resumoQ.data;
  const [pix, setPix] = useState("");
  const [valor, setValor] = useState("");

  const pixSalvoQ = useQuery({
    queryKey: ["loja-pix-saque", lojaId],
    enabled: !!lojaId,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase
        .from("lojas")
        .select("pix_chave_saque")
        .eq("id", lojaId)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.pix_chave_saque ?? "") as string;
    },
  });

  useEffect(() => {
    if (pixSalvoQ.data && !pix) setPix(pixSalvoQ.data);
  }, [pixSalvoQ.data]);

  const salvarPixM = useMutation({
    mutationFn: async (chave: string) => {
      const { error } = await supabase
        .from("lojas")
        .update({ pix_chave_saque: chave.trim() } as any)
        .eq("id", lojaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Chave PIX salva");
      qc.invalidateQueries({ queryKey: ["loja-pix-saque", lojaId] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar chave PIX"),
  });

  const saldo = resumo?.saldo ?? 0;
  const min = resumo?.valor_minimo ?? 50;
  const pode = !!resumo?.pode_sacar_hoje;
  const pixSalvo = pixSalvoQ.data ?? "";
  const pixMudou = pix.trim() !== pixSalvo.trim();

  const RESERVA_MIN = 20;
  const handleSolicitar = () => {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return;
    if (saldo - v < RESERVA_MIN) {
      toast.error(`Deixe pelo menos ${brl(RESERVA_MIN)} em saldo para chamar entregadores`);
      return;
    }
    solicitarM.mutate(
      { valor: v, pix_chave: pix.trim() },
      { onSuccess: () => { setValor(""); } },
    );
  };

  return (
    <section className="bg-white border border-border rounded-2xl p-8 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-slate-50 rounded-xl">
          <Wallet className="h-6 w-6 text-navy" />
        </div>
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Carteira de Vendas</h3>
          <p className="text-[11px] text-muted-foreground">Vendas em cartão via Marketplace</p>
        </div>
      </div>

      <div className="flex flex-col mb-8">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Saldo Disponível</span>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-black text-navy">{resumoQ.isLoading ? "…" : brl(saldo)}</span>
        </div>
        {(resumo?.saldo_bruto ?? 0) > saldo && (
          <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground/70">
            <div className="flex justify-between"><span>Saldo bruto</span><span className="font-mono">{brl(Number(resumo?.saldo_bruto ?? 0))}</span></div>
            {Number(resumo?.reservado_mensalidade ?? 0) > 0 && (
              <div className="flex justify-between text-yellow-600/80"><span>− Mensalidade em aberto</span><span className="font-mono">{brl(Number(resumo?.reservado_mensalidade ?? 0))}</span></div>
            )}
            {Number(resumo?.reservado_taxa_mp ?? 0) > 0 && (
              <div className="flex justify-between text-yellow-600/80"><span>− Reserva taxa MP (7d)</span><span className="font-mono">{brl(Number(resumo?.reservado_taxa_mp ?? 0))}</span></div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4 mb-8">
        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Chave PIX para receber</label>
          <div className="relative">
            <input
              value={pix}
              onChange={(e) => setPix(e.target.value)}
              placeholder="CPF, e-mail, telefone..."
              className="w-full h-14 pl-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-navy font-medium focus:bg-white focus:ring-2 focus:ring-navy/5 transition-all outline-none"
            />
            <button 
              onClick={() => salvarPixM.mutate(pix)}
              disabled={!pixMudou || !pix.trim() || salvarPixM.isPending}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-navy hover:bg-navy/5 rounded-lg transition-colors disabled:opacity-30"
              title="Salvar chave PIX"
            >
              <Save className={`h-5 w-5 ${salvarPixM.isPending ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor do Saque</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy font-bold">{i18nConfig.currencySymbol}</span>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0,00"
              className="w-full h-14 pl-12 pr-4 bg-slate-50 border border-slate-200 rounded-xl text-lg font-bold text-navy focus:bg-white focus:ring-2 focus:ring-navy/5 transition-all outline-none"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSolicitar}
        disabled={!pode || solicitarM.isPending || !pix.trim() || !valor}
        className="w-full h-14 bg-navy hover:bg-navy/90 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-navy/10 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send className="h-4 w-4" />
        Solicitar Saque via PIX
      </button>

      {!pode && !resumoQ.isLoading && (
        <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {resumo?.tem_saque_pendente
              ? "Já existe um saque pendente em análise."
              : saldo < min
              ? `Saldo abaixo do mínimo necessário para saque (${brl(min)}).`
              : resumo?.ultimo_saque_em
              ? `Limite de 1 saque por semana. Próximo saque disponível após ${formatDate(new Date(resumo.ultimo_saque_em).getTime() + 7 * 24 * 3600 * 1000)}.`
              : "Saque indisponível no momento."}
          </p>
        </div>
      )}

      <div className="mt-8 mb-8 rounded-xl border border-yellow-500/20 bg-yellow-50/50 p-4 flex items-start gap-3">
        <div className="p-1.5 bg-yellow-500/20 rounded-full shrink-0">
          <Clock className="h-3 w-3 text-yellow-600" />
        </div>
        <div className="text-[11px] leading-relaxed text-yellow-700">
          Mantenha sempre pelo menos <strong>{brl(RESERVA_MIN)}</strong> em saldo para que sua loja continue visível e os entregadores possam aceitar pedidos.
        </div>
      </div>

      <div className="pt-8 border-t border-border">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Últimos saques</div>
        {saquesQ.isLoading ? (
          <div className="text-[10px] text-muted-foreground">Carregando…</div>
        ) : (saquesQ.data ?? []).length === 0 ? (
          <div className="text-[10px] text-muted-foreground">Nenhum saque ainda.</div>
        ) : (
          <div className="space-y-4">
            {(saquesQ.data ?? []).slice(0, 3).map((s) => (
              <div key={s.id} className="flex items-center justify-between group">
                <div className="min-w-0">
                  <div className="text-lg font-bold text-navy/80">{brl(Number(s.valor))}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(s.solicitado_em)} · {s.pix_chave.slice(0, 4)}***
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge status={s.status} />
                  {s.status === 'pago' && <span className="text-[10px] text-green-500 font-bold uppercase tracking-tighter">Pago</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

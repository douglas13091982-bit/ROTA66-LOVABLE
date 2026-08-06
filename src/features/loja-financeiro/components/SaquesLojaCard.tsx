import { useEffect, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Wallet, Send, CheckCircle2, XCircle, Clock, Save, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSaquesLoja, type SaqueLojaRow } from "../hooks/use-saques-loja";
import { formatCurrency } from "@/lib/format/currency";
import { i18nConfig } from "@/lib/i18n-config";

const brl = (v: number) => formatCurrency(v);

function StatusBadge({ status }: { status: SaqueLojaRow["status"] }) {
  const map: Record<string, { cls: string; label: string; icon: any }> = {
    solicitado: { cls: "bg-yellow-500/15 text-yellow-500", label: "Pendente", icon: Clock },
    pago: { cls: "bg-green-500/15 text-green-500", label: "Pago", icon: CheckCircle2 },
    rejeitado: { cls: "bg-destructive/15 text-destructive", label: "Rejeitado", icon: XCircle },
    cancelado: { cls: "bg-muted text-muted-foreground", label: "Cancelado", icon: XCircle },
  };
  const c = map[status] ?? map.solicitado;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${c.cls}`}>
      <Icon className="h-3 w-3" /> {c.label}
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
    <section className="bg-white border border-border rounded-xl p-6 space-y-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold">
          <Wallet className="h-3.5 w-3.5" /> Carteira de vendas
        </div>
        <div className="text-xs text-muted-foreground">Mínimo: {brl(min)} · 1 saque/semana</div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Disponível para saque</div>
        <div className="text-4xl font-bold text-navy/40 mt-1">{resumoQ.isLoading ? "…" : brl(saldo)}</div>
        {(resumo?.saldo_bruto ?? 0) > saldo && (
          <div className="mt-2 grid gap-1 text-[11px] text-muted-foreground">
            <div className="flex justify-between"><span>Saldo bruto</span><span className="font-mono">{brl(Number(resumo?.saldo_bruto ?? 0))}</span></div>
            {Number(resumo?.reservado_mensalidade ?? 0) > 0 && (
              <div className="flex justify-between text-yellow-600"><span>− Mensalidade em aberto</span><span className="font-mono">{brl(Number(resumo?.reservado_mensalidade ?? 0))}</span></div>
            )}
            {Number(resumo?.reservado_taxa_mp ?? 0) > 0 && (
              <div className="flex justify-between text-yellow-600"><span>− Reserva taxa Mercado Pago (7d)</span><span className="font-mono">{brl(Number(resumo?.reservado_taxa_mp ?? 0))}</span></div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Cada pedido pago no catálogo entra automaticamente aqui. Mensalidades em aberto e a taxa do Mercado Pago são descontadas antes de liberar o saque.
        </p>
      </div>

      <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 text-yellow-200 px-3 py-2 text-xs">
        ⚠️ Mantenha sempre pelo menos <strong>{brl(RESERVA_MIN)}</strong> em saldo para conseguir chamar entregadores. Esse mesmo saldo é usado para pagar as entregas.
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Chave PIX para receber
        </label>
        <div className="flex gap-2">
          <input
            value={pix}
            onChange={(e) => setPix(e.target.value)}
            placeholder="CPF, e-mail, telefone..."
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-gray-50/50 text-sm focus:bg-white focus:ring-2 focus:ring-red-100 transition-all outline-none"
          />
          <button
            type="button"
            disabled={!pixMudou || !pix.trim() || salvarPixM.isPending}
            onClick={() => salvarPixM.mutate(pix)}
            className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
          >
            <Copy className="h-3.5 w-3.5" /> Copiar
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <div className="flex-1 relative">
          <input
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder={`Valor a sacar (${i18nConfig.currencySymbol})`}
            inputMode="decimal"
            className="w-full px-4 py-4 rounded-xl border border-border bg-gray-50/50 text-sm focus:bg-white focus:ring-2 focus:ring-red-100 transition-all outline-none pr-20"
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground">BRL</div>
        </div>
        <button
          type="button"
          disabled={!pode || solicitarM.isPending || !pix.trim() || !valor}
          onClick={handleSolicitar}
          className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-red-400 hover:bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg shadow-red-100 active:scale-95"
        >
          <Send className="h-4 w-4" /> Solicitar saque
        </button>
      </div>
      {!pode && !resumoQ.isLoading && (
        <p className="text-[11px] text-muted-foreground">
          {resumo?.tem_saque_pendente
            ? "Já existe um saque pendente."
            : saldo < min
            ? `Saldo abaixo do mínimo (${brl(min)}).`
            : resumo?.ultimo_saque_em
            ? `Você poderá solicitar novo saque após ${new Date(new Date(resumo.ultimo_saque_em).getTime() + 7 * 24 * 3600 * 1000).toLocaleDateString("pt-BR")}.`
            : "Saque indisponível."}
        </p>
      )}

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
                    {new Date(s.solicitado_em).toLocaleDateString(i18nConfig.locale)} · {s.pix_chave.slice(0, 4)}***
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

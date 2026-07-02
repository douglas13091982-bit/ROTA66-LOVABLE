import { useState } from "react";
import { Wallet, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useSaquesLoja, type SaqueLojaRow } from "../hooks/use-saques-loja";

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
  const { resumoQ, saquesQ, solicitarM } = useSaquesLoja(lojaId);
  const resumo = resumoQ.data;
  const [pix, setPix] = useState("");
  const [valor, setValor] = useState("");

  const saldo = resumo?.saldo ?? 0;
  const min = resumo?.valor_minimo ?? 50;
  const pode = !!resumo?.pode_sacar_hoje;

  const handleSolicitar = () => {
    const v = Number(valor.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return;
    solicitarM.mutate(
      { valor: v, pix_chave: pix.trim() },
      { onSuccess: () => { setPix(""); setValor(""); } },
    );
  };

  return (
    <section className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider font-bold">
          <Wallet className="h-3.5 w-3.5" /> Carteira de vendas
        </div>
        <div className="text-xs text-muted-foreground">Mínimo: {brl(min)} · 1 saque/semana</div>
      </div>

      <div>
        <div className="text-3xl font-bold">{resumoQ.isLoading ? "…" : brl(saldo)}</div>
        <p className="text-xs text-muted-foreground mt-1">
          Cada pedido pago no catálogo entra automaticamente aqui. Solicite o saque via PIX ao admin.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
        <input
          value={pix}
          onChange={(e) => setPix(e.target.value)}
          placeholder="Sua chave PIX"
          className="px-3 py-2 rounded-md border border-border bg-background text-sm"
        />
        <input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor (R$)"
          inputMode="decimal"
          className="px-3 py-2 rounded-md border border-border bg-background text-sm"
        />
        <button
          type="button"
          disabled={!pode || solicitarM.isPending || !pix.trim() || !valor}
          onClick={handleSolicitar}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" /> Solicitar
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

      <div className="pt-2 border-t border-border">
        <div className="text-xs font-bold uppercase text-muted-foreground mb-2">Últimos saques</div>
        {saquesQ.isLoading ? (
          <div className="text-xs text-muted-foreground">Carregando…</div>
        ) : (saquesQ.data ?? []).length === 0 ? (
          <div className="text-xs text-muted-foreground">Nenhum saque ainda.</div>
        ) : (
          <div className="space-y-2">
            {(saquesQ.data ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm bg-background border border-border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <div className="font-semibold">{brl(Number(s.valor))}</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {new Date(s.solicitado_em).toLocaleString("pt-BR")} · {s.pix_chave}
                  </div>
                  {s.motivo_rejeicao && (
                    <div className="text-[11px] text-destructive">Motivo: {s.motivo_rejeicao}</div>
                  )}
                </div>
                <StatusBadge status={s.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

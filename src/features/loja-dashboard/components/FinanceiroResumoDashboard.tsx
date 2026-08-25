import { Link } from "@tanstack/react-router";
import { CalendarDays, ArrowRight } from "lucide-react";
import { useMinhaLoja } from "@/hooks/use-loja";
import { useFinanceiroLoja } from "@/features/loja-financeiro/hooks/use-financeiro-loja";
import { PreviaSemanaCard } from "@/features/loja-financeiro/components/PreviaSemanaCard";
import { formatCurrencyValue, formatDate } from "@/lib/format";

export function FinanceiroResumoDashboard() {
  const { data: loja } = useMinhaLoja();
  const { mensalidades, mensalidadeValor, loading } = useFinanceiroLoja(loja);

  if (!loja) return null;

  const proxMens = mensalidades
    .filter((m) => !m.pago)
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))[0];

  const vencFmt = proxMens
    ? formatDate(proxMens.vencimento)
    : null;

  const valor = proxMens ? Number(proxMens.valor) : mensalidadeValor;
  const planoMensalAtivo = Boolean((loja as any).plano_mensal_ativo);
  // Fonte de verdade: taxa do plano vinculado; cai para a coluna legada
  // apenas quando a loja ainda não tem plano.
  const plano = (loja as any).plano ?? null;
  const taxaPorPedido = Number(
    plano?.taxa_por_pedido ?? (loja as any).taxa_por_pedido ?? 0,
  );

  return (
    <div className="space-y-4 mb-6">
      {planoMensalAtivo && (
        <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-3">
          <div className="p-2 rounded-md bg-amber-500/15 text-amber-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="font-display text-lg">Mensalidade do plano</h3>
              <Link
                to="/loja/financeiro"
                className="text-xs font-bold uppercase tracking-wider text-primary hover:underline inline-flex items-center gap-1"
              >
                Ver financeiro <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {loading ? (
              <p className="text-sm text-muted-foreground mt-2">Carregando…</p>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Valor
                  </div>
                  <div className="text-2xl font-bold">
                    R$ {formatCurrencyValue(Number(valor || 0))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {proxMens ? "Próximo vencimento" : "Status"}
                  </div>
                  <div className="text-2xl font-bold">
                    {vencFmt ?? <span className="text-emerald-400">Em dia</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <PreviaSemanaCard
        lojaId={loja.id}
        taxaPorPedido={taxaPorPedido}
        planoMensalAtivo={planoMensalAtivo}
      />
    </div>
  );
}

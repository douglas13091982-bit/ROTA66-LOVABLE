import { Link } from "@tanstack/react-router";
import { Wallet, ArrowRight, AlertTriangle } from "lucide-react";
import { useSaldoLoja } from "@/features/loja-financeiro/hooks/use-saldo-loja";

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function SaldoEntregaCard({ lojaId }: { lojaId: string }) {
  const { saldoQ } = useSaldoLoja(lojaId);
  const saldo = Number(saldoQ.data?.saldo ?? 0);
  const negativo = saldo <= 0;

  return (
    <div className="bg-card border border-border rounded-lg p-5 flex items-start gap-3 mb-4">
      <div
        className={`p-2 rounded-md ${
          negativo ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400"
        }`}
      >
        <Wallet className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="font-display text-lg">Saldo da loja</h3>
          <Link
            to="/loja/financeiro"
            className="text-xs font-bold uppercase tracking-wider text-primary hover:underline inline-flex items-center gap-1"
          >
            Recarregar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="mt-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Usado para pagar entregadores e disponível para saque semanal
          </div>
          <div
            className={`text-2xl font-bold ${
              negativo ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {saldoQ.isLoading ? "—" : brl(saldo)}
          </div>
          {negativo && (
            <div className="mt-2 text-xs text-red-300 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Sem saldo: novos pedidos não serão oferecidos aos entregadores.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

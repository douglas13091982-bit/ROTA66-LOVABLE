import { Wallet } from "lucide-react";
import { useSaquesLoja } from "@/features/loja-financeiro/hooks/use-saques-loja";

export function SaldoCatalogoCard({ lojaId }: { lojaId: string }) {
  const { resumoQ } = useSaquesLoja(lojaId);
  const saldo = resumoQ.data?.saldo ?? 0;
  const pendente = resumoQ.data?.tem_saque_pendente;

  return (
    <div className="pp-card rounded-2xl p-5 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center text-primary">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-white/50">
            Saldo dos pedidos (catálogo)
          </div>
          <div className="text-2xl font-semibold text-white">
            R$ {saldo.toFixed(2)}
          </div>
          <div className="text-xs text-white/50 mt-1">
            {pendente
              ? "Você tem um saque em análise"
              : "Disponível para saque semanal"}
          </div>
        </div>
      </div>
      <a
        href="/financeiro"
        className="text-xs px-3 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition"
      >
        Ver financeiro
      </a>
    </div>
  );
}

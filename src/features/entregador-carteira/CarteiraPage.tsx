import { EntregadorShell } from "@/components/EntregadorShell";
import { useCarteira } from "./hooks/use-carteira";
import { BloqueioAlert } from "./components/BloqueioAlert";
import { HistoricoTransacoes } from "./components/HistoricoTransacoes";
import { SaqueCard } from "./components/SaqueCard";

export function CarteiraPage() {
  const { saldoQ, txQ } = useCarteira();
  const saldo = saldoQ.data ?? null;

  return (
    <EntregadorShell title="Carteira">
      <div className="max-w-2xl mx-auto space-y-5">
        {saldo?.bloqueado && <BloqueioAlert />}
        <SaqueCard />
        <HistoricoTransacoes isLoading={txQ.isLoading} transacoes={txQ.data ?? []} />
      </div>
    </EntregadorShell>
  );
}


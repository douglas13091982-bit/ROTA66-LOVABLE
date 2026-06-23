import { EntregadorShell } from "@/components/EntregadorShell";
import { useCarteira } from "./hooks/use-carteira";
import { usePixRecarga } from "./hooks/use-pix-recarga";
import { PasseMensalCard } from "./components/PasseMensalCard";
import { BloqueioAlert } from "./components/BloqueioAlert";
import { HistoricoTransacoes } from "./components/HistoricoTransacoes";
import { SaqueCard } from "./components/SaqueCard";
import { PagarMensalidadeComSaldoCard } from "./components/PagarMensalidadeComSaldoCard";



export function CarteiraPage() {
  const { saldoQ, cfgQ, txQ } = useCarteira();
  const { recarga, setRecarga, criando, copied, gerarPix, copiar } = usePixRecarga();

  const saldo = saldoQ.data ?? null;
  const cfg = cfgQ.data ?? null;
  const featureAtiva = cfg?.ativo;

  return (
    <EntregadorShell title="Carteira">
      <div className="max-w-2xl mx-auto space-y-5">
        {featureAtiva ? (
          <PasseMensalCard
            saldo={saldo}
            saldoLoading={saldoQ.isLoading}
            cfg={cfg}
            recarga={recarga}
            criando={criando}
            copied={copied}
            onGerarPix={gerarPix}
            onCopiar={copiar}
            onFecharRecarga={() => setRecarga(null)}
          />
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
            A cobrança de mensalidade está desativada no momento. Você pode operar normalmente.
          </div>
        )}

        {saldo?.bloqueado && <BloqueioAlert />}

        <SaqueCard />



        <HistoricoTransacoes isLoading={txQ.isLoading} transacoes={txQ.data ?? []} />
      </div>
    </EntregadorShell>
  );
}

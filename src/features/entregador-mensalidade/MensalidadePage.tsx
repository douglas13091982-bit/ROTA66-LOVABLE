import { EntregadorShell } from "@/components/EntregadorShell";
import { useCarteira } from "@/features/entregador-carteira/hooks/use-carteira";
import { usePixRecarga } from "@/features/entregador-carteira/hooks/use-pix-recarga";
import { PasseMensalCard } from "@/features/entregador-carteira/components/PasseMensalCard";
import { PagarMensalidadeComSaldoCard } from "@/features/entregador-carteira/components/PagarMensalidadeComSaldoCard";
import { BloqueioAlert } from "@/features/entregador-carteira/components/BloqueioAlert";

export function MensalidadePage() {
  const { saldoQ, cfgQ } = useCarteira();
  const { recarga, setRecarga, criando, copied, gerarPix, copiar } = usePixRecarga();

  const saldo = saldoQ.data ?? null;
  const cfg = cfgQ.data ?? null;
  const featureAtiva = cfg?.ativo;

  return (
    <EntregadorShell title="Cobrança de mensalidade">
      <div className="max-w-2xl mx-auto space-y-5">
        {featureAtiva ? (
          <>
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
            <PagarMensalidadeComSaldoCard
              mensalidadeValor={Number(saldo?.mensalidade_valor ?? 0)}
              mensalidadePaga={saldo?.mensalidade_paga === true}
            />
            {saldo?.bloqueado && <BloqueioAlert />}
          </>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/60">
            A cobrança de mensalidade está desativada no momento. Você pode operar normalmente.
          </div>
        )}
      </div>
    </EntregadorShell>
  );
}

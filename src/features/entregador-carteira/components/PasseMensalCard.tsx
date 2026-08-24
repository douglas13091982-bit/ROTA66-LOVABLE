import { Calendar, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { brl } from "../logic/helpers";
import { PixRecargaPanel } from "./PixRecargaPanel";
import type { ConfigCreditos, RecargaPixState, SaldoEntregador } from "../logic/types";
import { formatDate } from "@/lib/format";

type Props = {
  saldo: SaldoEntregador;
  saldoLoading: boolean;
  cfg: ConfigCreditos;
  recarga: RecargaPixState | null;
  criando: boolean;
  copied: boolean;
  onGerarPix: () => void;
  onCopiar: () => void;
  onFecharRecarga: () => void;
};

export function PasseMensalCard({
  saldo,
  saldoLoading,
  cfg,
  recarga,
  criando,
  copied,
  onGerarPix,
  onCopiar,
  onFecharRecarga,
}: Props) {
  const mpOk = cfg?.mp_configurado;
  const mensalidadePaga = saldo?.mensalidade_paga === true;
  const vencimentoDate = saldo?.data_vencimento_atual
    ? new Date(saldo.data_vencimento_atual)
    : null;
  const valor = Number(saldo?.mensalidade_valor ?? 0);

  return (
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
        {saldoLoading ? "..." : brl(saldo?.mensalidade_valor)}
      </div>
      <div className="text-xs text-white/40 mt-1">
        Vencimento{" "}
        {vencimentoDate
          ? formatDate(vencimentoDate)
          : `dia ${saldo?.dia_vencimento ?? "—"}`}
        {mensalidadePaga
          ? " · mensalidade já quitada para este mês"
          : " · pague para manter o acesso"}
      </div>

      {!mpOk && (
        <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
          Pagamento indisponível: Mercado Pago do sistema ainda não foi configurado pelo administrador.
        </div>
      )}

      {!recarga && valor > 0 && !mensalidadePaga && (
        <button
          onClick={onGerarPix}
          disabled={criando || !mpOk}
          className="mt-4 w-full py-3 rounded-md font-bold uppercase tracking-wider text-sm disabled:opacity-40 inline-flex items-center justify-center gap-2 text-white border"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.55 0.16 155), oklch(0.42 0.14 155))",
            borderColor: "oklch(0.6 0.18 155 / 0.55)",
          }}
        >
          {criando && <Loader2 className="h-4 w-4 animate-spin" />}
          Pagar agora
        </button>
      )}

      {!recarga && valor <= 0 && (
        <div className="mt-4 text-xs text-white/50 text-center py-2">
          Mensalidade ainda não foi definida pelo administrador.
        </div>
      )}

      {recarga && (
        <PixRecargaPanel
          recarga={recarga}
          copied={copied}
          onCopiar={onCopiar}
          onFechar={onFecharRecarga}
        />
      )}
    </div>
  );
}

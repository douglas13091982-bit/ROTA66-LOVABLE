import { Check, Loader2, QrCode, CreditCard } from "lucide-react";
import type { Cobranca, DialogState } from "../logic/types";
import { formatDate } from "@/lib/format";

type Props = {
  loading: boolean;
  cobrancas: Cobranca[];
  cobAbertas: Cobranca[];
  cobAberto: number;
  pixHabilitado: boolean;
  onDialog: (d: DialogState) => void;
  onPagarMp?: (cobrancaId: string) => void;
  onPagarTudoMp?: () => void;
};

export function CobrancasTabela({
  loading,
  cobrancas,
  cobAbertas,
  cobAberto,
  pixHabilitado,
  onDialog,
  onPagarMp,
  onPagarTudoMp,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="font-display text-xl">Taxas por pedido</h2>
        {cobAbertas.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {onPagarTudoMp && (
              <button
                onClick={onPagarTudoMp}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-xs tracking-wider rounded-md"
                title="Pagar cobranças antigas via Mercado Pago"
              >
                <CreditCard className="h-4 w-4" />
                Pagar pendências via MP
              </button>
            )}
            <button
              disabled={!pixHabilitado}
              onClick={() =>
                onDialog({
                  tipo: "agrupado-cobranca",
                  valor: cobAberto,
                  ids: cobAbertas.map((c) => c.id),
                  titulo: "Pagar taxas de entrega em aberto",
                  descricao: `${cobAbertas.length} cobrança(s) — total R$ ${cobAberto.toFixed(2)}`,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              title={!pixHabilitado ? "PIX do sistema ainda não configurado" : undefined}
            >
              <QrCode className="h-4 w-4" />
              Pagar pendências via PIX
            </button>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        A taxa por pedido é debitada automaticamente do saldo da loja no momento da entrega,
        na mesma movimentação que paga o entregador. Esta lista fica só para visualização e controle.
      </p>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : cobrancas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cobrança ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Gerada em</th>
                <th className="text-right">Valor</th>
                <th className="text-left pl-4">Vencimento</th>
                <th className="text-left pl-4">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cobrancas.map((c) => {
                const venc = new Date(c.vencimento);
                const atrasado = !c.pago && venc < new Date();
                const solicitado = !c.pago && !!c.pago_solicitado_em;
                return (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="py-2">{formatDate(c.created_at)}</td>
                    <td className="text-right">R$ {Number(c.valor).toFixed(2)}</td>
                    <td className="pl-4">{formatDate(venc)}</td>
                    <td className="pl-4">
                      {c.pago ? (
                        <span className="text-green-500 text-xs font-bold uppercase inline-flex items-center gap-1">
                          <Check className="h-3 w-3" /> Pago
                        </span>
                      ) : solicitado ? (
                        <span className="text-amber-500 text-xs font-bold uppercase">
                          Aguardando confirmação
                        </span>
                      ) : atrasado ? (
                        <span className="text-primary text-xs font-bold uppercase">Atrasado</span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-bold uppercase">
                          Em aberto
                        </span>
                      )}
                    </td>
                    <td className="pl-4 text-right">
                      {!c.pago && (
                        <div className="inline-flex items-center gap-3 justify-end">
                          {onPagarMp && (
                            <button
                              onClick={() => onPagarMp(c.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-400 hover:underline"
                              title="Pagar via Mercado Pago (PIX ou cartão)"
                            >
                              <CreditCard className="h-3 w-3" /> MP
                            </button>
                          )}
                          <button
                            onClick={() =>
                              onDialog({
                                tipo: "cobranca",
                                valor: Number(c.valor),
                                ids: [c.id],
                                titulo: "Pagar taxa do pedido",
                                descricao: `Vencimento ${formatDate(venc)}`,
                              })
                            }
                            className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                            title="Pagar via PIX manual (sem MP)"
                          >
                            <QrCode className="h-3 w-3" /> PIX
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

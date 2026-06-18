import { Check, Loader2, QrCode, CreditCard } from "lucide-react";
import type { Cobranca, DialogState } from "../logic/types";

type Props = {
  loading: boolean;
  cobrancas: Cobranca[];
  cobAbertas: Cobranca[];
  cobAberto: number;
  pixHabilitado: boolean;
  onDialog: (d: DialogState) => void;
  onPagarMp?: (cobrancaId: string) => void;
};

export function CobrancasTabela({
  loading,
  cobrancas,
  cobAbertas,
  cobAberto,
  pixHabilitado,
  onDialog,
  onPagarMp,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-xl">Taxas por pedido</h2>
        <button
          disabled={cobAbertas.length === 0 || !pixHabilitado}
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
          Pagar tudo via PIX
        </button>
      </div>
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
                    <td className="py-2">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="text-right">R$ {Number(c.valor).toFixed(2)}</td>
                    <td className="pl-4">{venc.toLocaleDateString("pt-BR")}</td>
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
                        <button
                          onClick={() =>
                            onDialog({
                              tipo: "cobranca",
                              valor: Number(c.valor),
                              ids: [c.id],
                              titulo: "Pagar taxa do pedido",
                              descricao: `Vencimento ${venc.toLocaleDateString("pt-BR")}`,
                            })
                          }
                          className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                        >
                          <QrCode className="h-3 w-3" /> Pagar
                        </button>
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

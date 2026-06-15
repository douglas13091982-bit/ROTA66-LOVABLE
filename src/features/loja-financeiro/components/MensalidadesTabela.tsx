import { Loader2, QrCode } from "lucide-react";
import type { DialogState, Mensalidade } from "../logic/types";

type Props = {
  loading: boolean;
  mensalidades: Mensalidade[];
  mensAbertas: Mensalidade[];
  mensAberto: number;
  pixHabilitado: boolean;
  onDialog: (d: DialogState) => void;
};

export function MensalidadesTabela({
  loading,
  mensalidades,
  mensAbertas,
  mensAberto,
  pixHabilitado,
  onDialog,
}: Props) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="font-display text-xl">Mensalidades</h2>
        <button
          disabled={mensAbertas.length === 0 || !pixHabilitado}
          onClick={() =>
            onDialog({
              tipo: "agrupado-mensalidade",
              valor: mensAberto,
              ids: mensAbertas.map((m) => m.id),
              titulo: "Pagar mensalidades em aberto",
              descricao: `${mensAbertas.length} mensalidade(s) — total R$ ${mensAberto.toFixed(2)}`,
            })
          }
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          title={!pixHabilitado ? "PIX do sistema ainda não configurado" : undefined}
        >
          <QrCode className="h-4 w-4" />
          Pagar mensalidades
        </button>

      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : mensalidades.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma mensalidade gerada ainda.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Competência</th>
                <th className="text-right">Valor</th>
                <th className="text-left pl-4">Vencimento</th>
                <th className="text-left pl-4">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {mensalidades.map((m) => {
                const venc = new Date(m.vencimento + "T00:00:00");
                const comp = new Date(m.competencia + "T00:00:00");
                const atrasada = !m.pago && venc < new Date();
                const solicitado = !m.pago && !!m.pago_solicitado_em;
                return (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="py-2">
                      {comp.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </td>
                    <td className="text-right">R$ {Number(m.valor).toFixed(2)}</td>
                    <td className="pl-4">{venc.toLocaleDateString("pt-BR")}</td>
                    <td className="pl-4">
                      {m.pago ? (
                        <span className="text-green-500 text-xs font-bold uppercase">Paga</span>
                      ) : solicitado ? (
                        <span className="text-amber-500 text-xs font-bold uppercase">
                          Aguardando confirmação
                        </span>
                      ) : atrasada ? (
                        <span className="text-primary text-xs font-bold uppercase">Atrasada</span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-bold uppercase">
                          Em aberto
                        </span>
                      )}
                    </td>
                    <td className="pl-4 text-right">
                      {!m.pago && (
                        <button
                          onClick={() =>
                            onDialog({
                              tipo: "mensalidade",
                              valor: Number(m.valor),
                              ids: [m.id],
                              titulo: `Pagar mensalidade ${comp.toLocaleDateString("pt-BR", {
                                month: "long",
                                year: "numeric",
                              })}`,
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

import { CheckCircle2, Loader2 } from "lucide-react";
import type { Mensalidade } from "../logic/types";
import { formatDate, formatMonthYear } from "@/lib/format";

export function MensalidadesSection({
  mensalidades,
  loading,
  onMarcarPaga,
}: {
  mensalidades: Mensalidade[];
  loading: boolean;
  onMarcarPaga: (id: string) => void;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-display text-xl mb-4">Mensalidades das lojas</h2>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : mensalidades.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma mensalidade gerada ainda. Use o botão acima.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground border-b border-border">
              <tr>
                <th className="text-left py-2">Loja</th>
                <th className="text-left pl-4">Competência</th>
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
                const atrasado = !m.pago && venc < new Date();
                const solicitado = !m.pago && !!m.pago_solicitado_em;
                return (
                  <tr key={m.id} className="border-b border-border/50">
                    <td className="py-2">{m.loja_nome || "—"}</td>
                    <td className="pl-4">
                      {formatMonthYear(comp)}
                    </td>
                    <td className="text-right">R$ {Number(m.valor).toFixed(2)}</td>
                    <td className="pl-4">{formatDate(venc)}</td>
                    <td className="pl-4">
                      {m.pago ? (
                        <span className="text-green-500 text-xs font-bold uppercase">Pago</span>
                      ) : solicitado ? (
                        <span className="text-amber-500 text-xs font-bold uppercase">
                          Loja avisou pagamento
                        </span>
                      ) : atrasado ? (
                        <span className="text-primary text-xs font-bold uppercase">Atrasada</span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-bold uppercase">
                          Em aberto
                        </span>
                      )}
                    </td>
                    <td className="text-right">
                      {!m.pago && (
                        <button
                          onClick={() => onMarcarPaga(m.id)}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Quitar
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
    </section>
  );
}

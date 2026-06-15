import { BellRing, CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import type { Cobranca, Mensalidade } from "../logic/types";

export function PagamentosAguardando({
  cobAguardando,
  mensAguardando,
  onMarcarCob,
  onMarcarMens,
  onQuitarVarias,
}: {
  cobAguardando: Cobranca[];
  mensAguardando: Mensalidade[];
  onMarcarCob: (id: string) => void;
  onMarcarMens: (id: string) => void;
  onQuitarVarias: (
    tabela: "cobrancas_loja" | "mensalidades_loja",
    ids: string[]
  ) => void;
}) {
  const total = cobAguardando.length + mensAguardando.length;
  if (total === 0) return null;

  return (
    <section className="bg-card border-2 border-amber-500/50 rounded-lg p-6">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <h2 className="font-display text-xl flex items-center gap-2">
          <BellRing className="h-5 w-5 text-amber-500" />
          Pagamentos aguardando sua confirmação
          <span className="ml-2 inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-amber-500 text-background text-xs font-bold">
            {total}
          </span>
        </h2>
        <div className="flex gap-2">
          {cobAguardando.length > 0 && (
            <button
              onClick={() => onQuitarVarias("cobrancas_loja", cobAguardando.map((c) => c.id))}
              className="px-3 py-1.5 bg-card border border-border text-xs font-bold uppercase rounded-md hover:bg-background"
            >
              Confirmar {cobAguardando.length} taxa(s)
            </button>
          )}
          {mensAguardando.length > 0 && (
            <button
              onClick={() => onQuitarVarias("mensalidades_loja", mensAguardando.map((m) => m.id))}
              className="px-3 py-1.5 bg-card border border-border text-xs font-bold uppercase rounded-md hover:bg-background"
            >
              Confirmar {mensAguardando.length} mensalidade(s)
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase text-muted-foreground border-b border-border">
            <tr>
              <th className="text-left py-2">Tipo</th>
              <th className="text-left pl-4">Loja</th>
              <th className="text-left pl-4">Referência</th>
              <th className="text-right pl-4">Valor</th>
              <th className="text-left pl-4">Loja avisou em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {mensAguardando.map((m) => (
              <tr key={`m-${m.id}`} className="border-b border-border/50">
                <td className="py-2">
                  <span className="text-xs font-bold uppercase text-amber-500">Mensalidade</span>
                </td>
                <td className="pl-4">{m.loja_nome || "—"}</td>
                <td className="pl-4">
                  {new Date(m.competencia + "T00:00:00").toLocaleDateString("pt-BR", {
                    month: "2-digit",
                    year: "numeric",
                  })}
                </td>
                <td className="text-right pl-4">R$ {Number(m.valor).toFixed(2)}</td>
                <td className="pl-4">
                  {m.pago_solicitado_em ? formatDateTime(m.pago_solicitado_em) : "—"}
                </td>
                <td className="text-right">
                  <button
                    onClick={() => onMarcarMens(m.id)}
                    className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 ml-auto"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Confirmar
                  </button>
                </td>
              </tr>
            ))}
            {cobAguardando.map((c) => (
              <tr key={`c-${c.id}`} className="border-b border-border/50">
                <td className="py-2">
                  <span className="text-xs font-bold uppercase text-primary">Taxa</span>
                </td>
                <td className="pl-4">{c.loja_nome || "—"}</td>
                <td className="pl-4">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="text-right pl-4">R$ {Number(c.valor).toFixed(2)}</td>
                <td className="pl-4">
                  {c.pago_solicitado_em ? formatDateTime(c.pago_solicitado_em) : "—"}
                </td>
                <td className="text-right">
                  <button
                    onClick={() => onMarcarCob(c.id)}
                    className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 ml-auto"
                  >
                    <CheckCircle2 className="h-3 w-3" /> Confirmar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

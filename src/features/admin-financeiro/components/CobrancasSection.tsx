import { CheckCircle2, Loader2 } from "lucide-react";
import type { Cobranca } from "../logic/types";

type TotalPorLoja = { loja_id: string; loja_nome: string; total: number; qtd: number };

function agruparEmAberto(cobrancas: Cobranca[]): TotalPorLoja[] {
  return Object.values(
    cobrancas.reduce((acc, c) => {
      if (c.pago) return acc;
      const key = c.loja_id;
      if (!acc[key])
        acc[key] = { loja_id: key, loja_nome: c.loja_nome || "—", total: 0, qtd: 0 };
      acc[key].total += Number(c.valor) || 0;
      acc[key].qtd += 1;
      return acc;
    }, {} as Record<string, TotalPorLoja>)
  ).sort((a, b) => b.total - a.total);
}

export function CobrancasSection({
  cobrancas,
  loading,
  onQuitarLoja,
}: {
  cobrancas: Cobranca[];
  loading: boolean;
  onQuitarLoja: (lojaId: string) => void;
}) {
  return (
    <section className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-display text-xl mb-4">Cobranças por pedido</h2>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : cobrancas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma cobrança registrada.</p>
      ) : (
        (() => {
          const totaisPorLoja = agruparEmAberto(cobrancas);
          if (totaisPorLoja.length === 0) return null;
          return (
            <div className="mb-6 border border-border rounded-md overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground bg-background/40 border-b border-border">
                  <tr>
                    <th className="text-left py-2 px-3">Loja</th>
                    <th className="text-right px-3">Pedidos em aberto</th>
                    <th className="text-right px-3">Total devido</th>
                    <th className="text-right px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {totaisPorLoja.map((t) => (
                    <tr key={t.loja_id} className="border-b border-border/50 last:border-0">
                      <td className="py-2 px-3 font-medium">{t.loja_nome}</td>
                      <td className="text-right px-3">{t.qtd}</td>
                      <td className="text-right px-3 font-bold text-primary">
                        R$ {t.total.toFixed(2)}
                      </td>
                      <td className="text-right px-3">
                        <button
                          onClick={() => onQuitarLoja(t.loja_id)}
                          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1 ml-auto"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, RotateCcw, Percent } from "lucide-react";
import { toast } from "sonner";
import { obterTaxasMp, salvarTaxasMp } from "@/lib/mensalidades-mp.functions";

type Form = { pix: string; debit_card: string; credit_card: string };

function toStr(n: number): string {
  return String(n).replace(".", ",");
}

function toNum(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function TaxasMpSection() {
  const qc = useQueryClient();
  const obter = useServerFn(obterTaxasMp);
  const salvar = useServerFn(salvarTaxasMp);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-taxas-mp"],
    queryFn: () => obter(),
  });

  const [form, setForm] = useState<Form>({ pix: "", debit_card: "", credit_card: "" });

  useEffect(() => {
    if (!data) return;
    setForm({
      pix: toStr(data.atual.pix),
      debit_card: toStr(data.atual.debit_card),
      credit_card: toStr(data.atual.credit_card),
    });
  }, [data]);

  const m = useMutation({
    mutationFn: (f: Form) =>
      salvar({
        data: {
          pix: toNum(f.pix),
          debit_card: toNum(f.debit_card),
          credit_card: toNum(f.credit_card),
        },
      }),
    onSuccess: () => {
      toast.success("Taxas atualizadas");
      qc.invalidateQueries({ queryKey: ["admin-taxas-mp"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const invalido =
    !Number.isFinite(toNum(form.pix)) ||
    !Number.isFinite(toNum(form.debit_card)) ||
    !Number.isFinite(toNum(form.credit_card));

  const resetPadrao = () => {
    if (!data) return;
    setForm({
      pix: toStr(data.padrao.pix),
      debit_card: toStr(data.padrao.debit_card),
      credit_card: toStr(data.padrao.credit_card),
    });
  };

  return (
    <section className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl mb-1">Taxas do Mercado Pago</h2>
        <p className="text-sm text-muted-foreground">
          Percentuais cobrados pelo Mercado Pago em cada venda do catálogo. Estes valores
          são <strong>debitados automaticamente</strong> do saldo da loja quando o pagamento
          é confirmado. Sempre que o MP retornar a taxa real na resposta, usamos ela;
          caso contrário, aplicamos os percentuais abaixo.
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                { key: "pix", label: "PIX", hint: "Recebimento instantâneo" },
                { key: "debit_card", label: "Cartão de débito", hint: "Processamento na hora" },
                { key: "credit_card", label: "Cartão de crédito", hint: "Processamento na hora" },
              ] as const
            ).map((row) => (
              <div key={row.key} className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form[row.key]}
                    onChange={(e) => setForm((f) => ({ ...f, [row.key]: e.target.value }))}
                    className="w-full pl-3 pr-9 py-2 bg-background border border-border rounded-md text-sm font-mono"
                    placeholder="0,00"
                  />
                  <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {row.hint} — padrão {toStr(data?.padrao[row.key] ?? 0)}%
                </p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => m.mutate(form)}
              disabled={m.isPending || invalido}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar taxas
            </button>
            <button
              onClick={resetPadrao}
              disabled={m.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-card border border-border rounded-md hover:bg-background"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar padrão
            </button>
          </div>
        </>
      )}
    </section>
  );
}

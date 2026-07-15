import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save, Percent, Store } from "lucide-react";
import { toast } from "sonner";
import { obterTaxaMarketplace, salvarTaxaMarketplace } from "@/lib/mensalidades-mp.functions";

function toStr(n: number): string {
  return String(n).replace(".", ",");
}
function toNum(s: string): number {
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function TaxaMarketplaceSection() {
  const qc = useQueryClient();
  const obter = useServerFn(obterTaxaMarketplace);
  const salvar = useServerFn(salvarTaxaMarketplace);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-taxa-marketplace"],
    queryFn: () => obter(),
  });

  const [pct, setPct] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    setPct(toStr(data.pct));
  }, [data]);

  const m = useMutation({
    mutationFn: (v: string) => salvar({ data: { pct: toNum(v) } }),
    onSuccess: () => {
      toast.success("Taxa marketplace atualizada");
      qc.invalidateQueries({ queryKey: ["admin-taxa-marketplace"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar"),
  });

  const invalido = !Number.isFinite(toNum(pct)) || toNum(pct) < 0 || toNum(pct) > 100;
  const ativo = Number.isFinite(toNum(pct)) && toNum(pct) > 0;

  return (
    <section className="bg-card border border-border rounded-lg p-6 space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-1 p-2 rounded-md bg-gradient-red shadow-red text-primary-foreground">
          <Store className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-display text-xl mb-1">Taxa marketplace</h2>
          <p className="text-sm text-muted-foreground">
            Percentual cobrado da loja em <strong>toda venda paga online (Mercado Pago)
            pelo catálogo público</strong>. É debitado do saldo da loja no momento em que o
            pagamento é confirmado — a loja passa a ver o valor líquido já descontado.
            Deixe <strong>0</strong> para desativar.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-[220px_auto] items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Percentual sobre a venda
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={pct}
                onChange={(e) => setPct(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-background border border-border rounded-md text-sm font-mono"
                placeholder="0,00"
              />
              <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              {ativo ? "Ativa — descontando na confirmação do pagamento" : "Desativada (0%)"}
            </p>
          </div>
          <button
            onClick={() => m.mutate(pct)}
            disabled={m.isPending || invalido}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase text-xs tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 h-fit"
          >
            {m.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </button>
        </div>
      )}
    </section>
  );
}

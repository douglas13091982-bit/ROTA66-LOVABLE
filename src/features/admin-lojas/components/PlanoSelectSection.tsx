import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlanosDisponiveis } from "@/features/loja-dashboard/hooks/use-planos-disponiveis";

interface Props {
  lojaId: string;
  planoIdAtual: string | null;
  onChanged: () => void;
}

export function PlanoSelectSection({ lojaId, planoIdAtual, onChanged }: Props) {
  const { data: planos, isLoading } = usePlanosDisponiveis();
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(planoIdAtual ?? "");

  async function salvar() {
    if (!value) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("lojas")
      .update({ plano_id: value })
      .eq("id", lojaId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    onChanged();
  }

  return (
    <section className="border-t border-border pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-yellow-500" />
        <h4 className="font-bold text-sm uppercase tracking-wider">Plano</h4>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando planos...</p>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
          >
            <option value="">— escolher plano —</option>
            {(planos ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} (R$ {Number(p.mensalidade_valor).toFixed(2)} / mês · R${" "}
                {Number(p.taxa_por_pedido).toFixed(2)} por pedido)
              </option>
            ))}
          </select>
          <button
            onClick={salvar}
            disabled={saving || !value || value === planoIdAtual}
            className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground disabled:opacity-50"
          >
            {saving ? "..." : "Aplicar"}
          </button>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">
        Aplicar um plano atualiza automaticamente o valor da mensalidade, dia de vencimento e a
        taxa por pedido da loja.
      </p>
    </section>
  );
}

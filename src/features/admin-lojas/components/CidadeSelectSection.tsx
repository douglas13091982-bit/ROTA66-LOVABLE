import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCidades } from "@/hooks/use-cidades";

interface Props {
  lojaId: string;
  cityIdAtual: string | null;
  onChanged: () => void;
}

export function CidadeSelectSection({ lojaId, cityIdAtual, onChanged }: Props) {
  const { cidades } = useCidades();
  const [cityId, setCityId] = useState(cityIdAtual ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = cityId && cityId !== (cityIdAtual ?? "");

  async function salvar() {
    if (!cityId) {
      toast.error("Selecione a cidade");
      return;
    }
    const cidade = cidades.find((c) => c.id === cityId);
    if (!cidade) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("lojas")
      .update({ city_id: cityId, cidade: cidade.nome, estado: cidade.uf })
      .eq("id", lojaId);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Erro ao salvar cidade");
      return;
    }
    toast.success("Cidade atualizada");
    onChanged();
  }

  return (
    <section className="border-t border-border pt-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        Cidade <span className="text-red-500">*</span>
      </div>
      <div className="flex gap-2">
        <select
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
          className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
        >
          <option value="">Selecione a cidade…</option>
          {cidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} / {c.uf}
            </option>
          ))}
        </select>
        <button
          onClick={salvar}
          disabled={!dirty || saving}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
      {!cityIdAtual && (
        <p className="text-[11px] text-amber-500 mt-1.5">
          Esta loja está sem cidade — defina uma para que apareça ao franqueado da cidade.
        </p>
      )}
    </section>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const OPCOES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "franqueado", label: "Franqueado" },
  { value: "colaborador", label: "Colaborador do franqueado" },
  { value: "auto", label: "Auto-cadastro (própria loja)" },
];

interface Props {
  lojaId: string;
  tipoAtual: string | null;
  nomeAtual: string | null;
  onChanged: () => void;
}

export function CriadoPorSelectSection({ lojaId, tipoAtual, nomeAtual, onChanged }: Props) {
  const [tipo, setTipo] = useState(tipoAtual ?? "auto");
  const [nome, setNome] = useState(nomeAtual ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = tipo !== (tipoAtual ?? "auto") || nome !== (nomeAtual ?? "");

  async function salvar() {
    setSaving(true);
    const { error } = await (supabase as any)
      .from("lojas")
      .update({ criado_por_tipo: tipo, criado_por_nome: nome.trim() || null })
      .eq("id", lojaId);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Erro ao salvar origem");
      return;
    }
    toast.success("Origem do cadastro atualizada");
    onChanged();
  }

  return (
    <section className="border-t border-border pt-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        Cadastrada por
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
          className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
        >
          {OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome de quem cadastrou (opcional)"
          className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
        />
        <button
          onClick={salvar}
          disabled={!dirty || saving}
          className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </section>
  );
}

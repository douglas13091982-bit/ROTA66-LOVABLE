import { useEffect, useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  lojaId: string;
  initialAtivo: boolean;
  initialValor: number;
}

/**
 * Toggle na barra de pedidos para ativar/desativar um bônus fixo
 * (por entrega) que é adicionado automaticamente a todo pedido novo.
 * O valor fica salvo em `lojas.bonus_entregador_valor` e a flag em
 * `lojas.bonus_entregador_ativo`.
 */
export function BonusEntregadorToggle({ lojaId, initialAtivo, initialValor }: Props) {
  const qc = useQueryClient();
  const [ativo, setAtivo] = useState<boolean>(initialAtivo);
  const [valorStr, setValorStr] = useState<string>(
    initialValor > 0 ? String(initialValor) : "",
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAtivo(initialAtivo);
    setValorStr(initialValor > 0 ? String(initialValor) : "");
  }, [initialAtivo, initialValor]);

  async function persistir(next: { ativo?: boolean; valor?: number }) {
    setSaving(true);
    const patch: Record<string, unknown> = {};
    if (next.ativo !== undefined) patch.bonus_entregador_ativo = next.ativo;
    if (next.valor !== undefined) patch.bonus_entregador_valor = next.valor;
    const { error } = await supabase
      .from("lojas")
      .update(patch as never)
      .eq("id", lojaId);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["minha-loja"] });
    return true;
  }

  async function onToggle() {
    const novo = !ativo;
    const valor = Number(valorStr) || 0;
    if (novo && valor <= 0) {
      toast.error("Defina um valor de bônus maior que zero antes de ativar.");
      return;
    }
    setAtivo(novo);
    const ok = await persistir({ ativo: novo });
    if (!ok) setAtivo(!novo);
    else toast.success(novo ? "Bônus fixo ativado para novos pedidos." : "Bônus fixo desativado.");
  }

  async function onBlurValor() {
    const valor = Number(valorStr) || 0;
    if (valor === Number(initialValor)) return;
    await persistir({ valor });
  }

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors md:inline-flex md:rounded-md md:py-1.5 ${
        ativo
          ? "border-[var(--rota-gold)]/50 bg-[var(--rota-gold)]/10 text-[var(--rota-gold)]"
          : "border-border bg-muted/30 text-muted-foreground md:bg-transparent"
      }`}
      title="Bônus fixo adicionado automaticamente a todo pedido novo"
    >
      <span
        className={`h-8 w-8 shrink-0 rounded-full grid place-items-center md:hidden ${
          ativo ? "bg-[var(--rota-gold)] text-[#0e0f12]" : "bg-muted text-muted-foreground"
        }`}
      >
        <Gift className="h-4 w-4" />
      </span>
      <Gift className="hidden h-3.5 w-3.5 md:block" />
      <div className="min-w-0 flex-1 md:flex md:flex-none md:items-center md:gap-2">
        <span className="block text-[11px] leading-tight md:inline md:text-xs">Bônus entregador</span>
        <div className="flex items-center gap-1">
          <span className="text-[11px] md:text-xs">R$</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={valorStr}
            onChange={(e) => setValorStr(e.target.value)}
            onBlur={onBlurValor}
            placeholder="0,00"
            className="w-12 md:w-16 bg-background/60 border border-border rounded px-1 py-0.5 text-foreground text-[11px] md:text-xs"
            disabled={saving}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        className={`ml-1 shrink-0 relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          ativo ? "bg-[var(--rota-gold)]" : "bg-muted"
        }`}
        aria-pressed={ativo}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
            ativo ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

}

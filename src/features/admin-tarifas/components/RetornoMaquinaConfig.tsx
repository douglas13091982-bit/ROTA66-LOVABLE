import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const QK = ["admin-retorno-maquina"];

/**
 * Taxa adicional por km usada quando a loja marca "Retorno com máquina"
 * em um pedido manual. O valor é cobrado do cliente e repassado integralmente
 * ao entregador, somado à taxa global do frete.
 */
export function RetornoMaquinaConfig() {
  const qc = useQueryClient();
  const [valor, setValor] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const { data } = useQuery({
    queryKey: QK,
    queryFn: async (): Promise<number> => {
      const { data, error } = await (supabase as any).rpc(
        "get_retorno_cartao_por_km",
      );
      if (error) throw error;
      return Number(data ?? 0) || 0;
    },
  });

  const atual = valor ?? String(data ?? 0);

  async function salvar() {
    setSalvando(true);
    const { error } = await (supabase as any)
      .from("config_financeiro")
      .update({ retorno_cartao_valor_por_km: Number(atual) || 0 })
      .eq("singleton", true);
    setSalvando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Taxa adicional atualizada");
    qc.invalidateQueries({ queryKey: QK });
  }

  return (
    <div className="border border-[#e4e8ef] bg-white p-5 mb-6">
      <h2 className="text-lg font-bold text-[#0f1b2d]">
        Taxa adicional por km · Retorno com máquina
      </h2>
      <p className="text-xs text-[#6b7688] mt-1 mb-4 max-w-2xl">
        Quando a loja marca “Retorno com máquina” em um pedido manual, o sistema
        multiplica a distância da loja até o cliente por este valor, soma no
        frete que o cliente paga e repassa o adicional ao entregador.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6b7688] mb-1">
            Valor por km (R$)
          </label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={atual}
            onChange={(e) => setValor(e.target.value)}
            className="h-11 w-40 border border-[#e4e8ef] bg-white px-3 text-[#0f1b2d]"
          />
        </div>
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="h-11 px-5 bg-[#e3000f] font-bold uppercase tracking-wider !text-white disabled:opacity-50"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </div>
  );
}

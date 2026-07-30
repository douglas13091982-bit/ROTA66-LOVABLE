import { useState } from "react";
import { Sparkles, Check, Star, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePlanosDisponiveis } from "../hooks/use-planos-disponiveis";

interface Props {
  lojaId: string;
  planoIdAtual: string | null;
}

export function MeuPlanoCard({ lojaId, planoIdAtual }: Props) {
  const qc = useQueryClient();
  const { data: planos, isLoading } = usePlanosDisponiveis();
  const [editing, setEditing] = useState(!planoIdAtual);
  const [selected, setSelected] = useState<string | null>(planoIdAtual);
  const [saving, setSaving] = useState(false);

  const planoAtual = planos?.find((p) => p.id === planoIdAtual) ?? null;

  async function salvar() {
    if (!selected || selected === planoIdAtual) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("lojas")
      .update({ plano_id: selected })
      .eq("id", lojaId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    setEditing(false);
    qc.invalidateQueries({ queryKey: ["minha-loja"] });
  }

  return (
    <section className="pp-card rounded-2xl p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="pp-disc pp-disc-accent h-10 w-10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-lg text-white">Meu plano</h3>
            <p className="text-xs text-white/55">
              {planoAtual
                ? "Plano atualmente vinculado à sua loja."
                : "Você ainda não escolheu um plano. Selecione um abaixo."}
            </p>
          </div>
        </div>
        {planoAtual && !editing && (
          <button
            onClick={() => {
              setSelected(planoIdAtual);
              setEditing(true);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-2 bg-[#AE0000] hover:bg-[#8d0000] !text-white border border-[#8d0000] transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" /> Trocar
          </button>
        )}
      </div>

      {!editing && planoAtual && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="font-semibold text-white">{planoAtual.nome}</div>
          {planoAtual.descricao && (
            <div className="text-xs text-white/60 mt-0.5">{planoAtual.descricao}</div>
          )}
          <div className="text-sm mt-2 text-white">
            <span className="text-white/55 text-xs">Mensalidade: </span>
            <span className="font-bold">
              R$ {Number(planoAtual.mensalidade_valor).toFixed(2)}
            </span>
            <span className="text-white/40 mx-2">•</span>
            <span className="text-white/55 text-xs">Por pedido: </span>
            <span className="font-bold">
              {Number(planoAtual.taxa_por_pedido) === 0
                ? "Isento"
                : `R$ ${Number(planoAtual.taxa_por_pedido).toFixed(2)}`}
            </span>
          </div>
        </div>
      )}

      {editing && (
        <>
          {isLoading ? (
            <div className="text-sm text-white/60">Carregando planos...</div>
          ) : !planos || planos.length === 0 ? (
            <div className="text-sm text-white/70 bg-white/[0.03] border border-white/10 rounded-lg p-4">
              Nenhum plano disponível no momento.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {planos.map((p) => {
                const sel = selected === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelected(p.id)}
                    className={`text-left rounded-xl p-4 border transition relative ${
                      sel
                        ? "border-yellow-500/70 bg-yellow-500/5"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    {p.destaque && (
                      <span className="absolute -top-2 left-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-yellow-500 text-black">
                        <Star className="h-3 w-3 fill-black" />
                        Recomendado
                      </span>
                    )}
                    {sel && (
                      <span className="absolute top-3 right-3 h-6 w-6 grid place-items-center rounded-full bg-yellow-500 text-black">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                    <div className="font-semibold text-white mb-1">{p.nome}</div>
                    {p.descricao && (
                      <div className="text-xs text-white/60 mb-3 line-clamp-2">
                        {p.descricao}
                      </div>
                    )}
                    <div className="text-sm space-y-0.5">
                      <div className="text-white">
                        <span className="text-white/55 text-xs">Mensalidade: </span>
                        <span className="font-bold">
                          R$ {Number(p.mensalidade_valor).toFixed(2)}
                        </span>
                      </div>
                      <div className="text-white">
                        <span className="text-white/55 text-xs">Por pedido: </span>
                        <span className="font-bold">
                          {Number(p.taxa_por_pedido) === 0
                            ? "Isento"
                            : `R$ ${Number(p.taxa_por_pedido).toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-3 mt-4">
            {planoAtual && (
              <button
                type="button"
                onClick={() => {
                  setSelected(planoIdAtual);
                  setEditing(false);
                }}
                className="flex-1 py-2.5 text-sm rounded-lg border border-white/15 text-white/80 hover:bg-white/5"
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={salvar}
              disabled={saving || !selected || selected === planoIdAtual}
              className="pp-cta flex-1 py-2.5 text-sm disabled:opacity-50"
            >
              {saving ? "Salvando..." : planoAtual ? "Salvar troca" : "Escolher plano"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

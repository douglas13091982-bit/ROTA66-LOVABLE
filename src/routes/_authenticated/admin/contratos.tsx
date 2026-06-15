import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { ContratoBody } from "@/components/ContratoView";
import { ScrollText, Save, FilePlus2, CheckCircle2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/contratos")({
  component: AdminContratos,
});

type ContratoRow = {
  id: string;
  titulo: string;
  conteudo: string;
  versao: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

function AdminContratos() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [conteudo, setConteudo] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: contratos = [], isLoading } = useQuery({
    queryKey: ["admin-contratos"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contratos")
        .select("*")
        .order("versao", { ascending: false });
      if (error) throw error;
      return data as ContratoRow[];
    },
  });

  const selected = useMemo(
    () => contratos.find((c) => c.id === selectedId) ?? contratos[0] ?? null,
    [contratos, selectedId],
  );

  useEffect(() => {
    if (selected) {
      setTitulo(selected.titulo);
      setConteudo(selected.conteudo);
    }
  }, [selected?.id]);

  const handleSalvar = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("contratos")
      .update({ titulo, conteudo })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar", { description: error.message });
      return;
    }
    toast.success("Contrato salvo");
    qc.invalidateQueries({ queryKey: ["admin-contratos"] });
  };

  const handleAtivar = async () => {
    if (!selected || selected.ativo) return;
    const ok = confirm(
      `Ativar a versão ${selected.versao}? Todas as lojas precisarão aceitar novamente no próximo acesso.`,
    );
    if (!ok) return;
    const { error } = await (supabase as any)
      .from("contratos")
      .update({ ativo: true })
      .eq("id", selected.id);
    if (error) {
      toast.error("Erro ao ativar", { description: error.message });
      return;
    }
    toast.success("Versão ativada");
    qc.invalidateQueries({ queryKey: ["admin-contratos"] });
  };

  const handleNovaVersao = async () => {
    const proxima =
      contratos.length > 0 ? Math.max(...contratos.map((c) => c.versao)) + 1 : 1;
    const base = selected ?? contratos[0];
    const { data, error } = await (supabase as any)
      .from("contratos")
      .insert({
        titulo: base?.titulo ?? "Termos de Uso",
        conteudo: base?.conteudo ?? "",
        versao: proxima,
        ativo: false,
      })
      .select()
      .maybeSingle();
    if (error) {
      toast.error("Erro ao criar versão", { description: error.message });
      return;
    }
    toast.success(`Versão ${proxima} criada (rascunho)`);
    await qc.invalidateQueries({ queryKey: ["admin-contratos"] });
    setSelectedId(data.id);
  };

  return (
    <AdminShell title="Contratos">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* Lista de versões */}
        <div className="pp-card rounded-2xl p-3 h-fit">
          <div className="flex items-center justify-between px-2 pb-3">
            <div className="flex items-center gap-2 text-white">
              <ScrollText className="h-4 w-4 text-yellow-300" />
              <div className="text-[13px] font-bold">Versões</div>
            </div>
            <button
              type="button"
              onClick={handleNovaVersao}
              className="h-7 px-2 rounded-md bg-white/5 hover:bg-white/10 text-white/80 text-[11px] font-semibold flex items-center gap-1"
              title="Criar nova versão a partir desta"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              Nova
            </button>
          </div>
          {isLoading && <div className="text-[12px] text-white/50 px-2">Carregando...</div>}
          <div className="space-y-1">
            {contratos.map((c) => {
              const active = (selected?.id ?? "") === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition border ${
                    active
                      ? "bg-white/[0.06] border-white/15"
                      : "bg-transparent border-transparent hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-semibold text-white">v{c.versao}</div>
                    {c.ativo && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 px-1.5 py-0.5 rounded">
                        Ativa
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-white/50 truncate">{c.titulo}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="pp-card rounded-2xl p-5 space-y-4">
          {!selected ? (
            <div className="text-white/60 text-[13px]">Nenhum contrato encontrado.</div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-white/40">
                    Editando versão
                  </div>
                  <div className="text-white text-lg font-bold">v{selected.versao}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreview((p) => !p)}
                    className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-[12px] font-semibold flex items-center gap-2"
                  >
                    {preview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {preview ? "Editar" : "Pré-visualizar"}
                  </button>
                  {!selected.ativo && (
                    <button
                      type="button"
                      onClick={handleAtivar}
                      className="h-9 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[12px] font-bold flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Ativar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSalvar}
                    disabled={saving}
                    className="h-9 px-3 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-black text-[12px] font-bold flex items-center gap-2 disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>

              <label className="block">
                <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/50 mb-1.5">
                  Título
                </span>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-yellow-400/60"
                />
              </label>

              {preview ? (
                <div className="bg-black/40 border border-white/10 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                  <ContratoBody conteudo={conteudo} />
                </div>
              ) : (
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-white/50 mb-1.5">
                    Conteúdo (markdown simples: # ## ###, listas com "-", **negrito**)
                  </span>
                  <textarea
                    value={conteudo}
                    onChange={(e) => setConteudo(e.target.value)}
                    rows={22}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white/90 font-mono text-[12.5px] leading-relaxed focus:outline-none focus:border-yellow-400/60"
                  />
                </label>
              )}

              <div className="text-[11px] text-white/50">
                Dica: ao ativar uma nova versão, todas as lojas existentes verão um modal
                no próximo acesso pedindo aceite da versão atual.
              </div>
            </>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

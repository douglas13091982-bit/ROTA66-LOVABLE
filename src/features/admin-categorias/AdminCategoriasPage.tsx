import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, EyeOff, Eye } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminPermissoes } from "@/hooks/use-admin-permissoes";
import { useLojaCategorias, type LojaCategoriaRow } from "@/hooks/use-loja-categorias";
import { IconPicker } from "./components/IconPicker";
import { CategoriaIconUploader } from "./components/CategoriaIconUploader";
import { getCategoriaIcon } from "@/lib/categoria-icons";

export function AdminCategoriasPage() {
  const { isSuper, loading: permLoading } = useAdminPermissoes();
  const { categorias, isLoading, create, update, remove } = useLojaCategorias({
    incluirInativas: true,
  });

  const [novoValue, setNovoValue] = useState("");
  const [novoLabel, setNovoLabel] = useState("");
  const [novoOrdem, setNovoOrdem] = useState("0");
  const [novoIcone, setNovoIcone] = useState<string | null>(null);
  const [novoIconeUrl, setNovoIconeUrl] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editOrdem, setEditOrdem] = useState("0");
  const [editIcone, setEditIcone] = useState<string | null>(null);
  const [editIconeUrl, setEditIconeUrl] = useState<string | null>(null);

  if (permLoading) {
    return (
      <AdminShell title="Categorias de Loja">
        <div className="text-white/60 text-sm">Carregando…</div>
      </AdminShell>
    );
  }

  if (!isSuper) {
    return (
      <AdminShell title="Categorias de Loja">
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
          <div className="text-sm text-white/60">
            Apenas o super admin pode gerenciar categorias.
          </div>
        </div>
      </AdminShell>
    );
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setCriando(true);
    const ok = await create({
      value: novoValue,
      label: novoLabel,
      ordem: Number(novoOrdem) || 0,
      icone: novoIcone,
      icone_url: novoIconeUrl,
    });
    setCriando(false);
    if (ok) {
      setNovoValue("");
      setNovoLabel("");
      setNovoOrdem("0");
      setNovoIcone(null);
      setNovoIconeUrl(null);
    }
  }

  function iniciarEdicao(c: LojaCategoriaRow) {
    setEditId(c.id);
    setEditLabel(c.label);
    setEditOrdem(String(c.ordem));
    setEditIcone(c.icone ?? null);
    setEditIconeUrl(c.icone_url ?? null);
  }

  async function salvarEdicao(c: LojaCategoriaRow) {
    const ok = await update(c.id, {
      label: editLabel.trim(),
      ordem: Number(editOrdem) || 0,
      icone: editIcone,
      icone_url: editIconeUrl,
    });
    if (ok) setEditId(null);
  }

  return (
    <AdminShell title="Categorias de Loja">
      <div className="max-w-3xl space-y-6">
        <form
          onSubmit={handleCriar}
          className="pp-card rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-white font-semibold">
            <Plus className="h-4 w-4" /> Nova categoria
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
                Identificador
              </span>
              <input
                value={novoValue}
                onChange={(e) => setNovoValue(e.target.value)}
                placeholder="ex: cafeteria"
                required
                className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
              />
              <span className="text-[10px] text-white/40">
                Sem espaços, minúsculas (será sanitizado)
              </span>
            </label>
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
                Nome exibido
              </span>
              <input
                value={novoLabel}
                onChange={(e) => setNovoLabel(e.target.value)}
                placeholder="Cafeteria"
                required
                className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
                Ordem
              </span>
              <input
                type="number"
                value={novoOrdem}
                onChange={(e) => setNovoOrdem(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
              />
            </label>
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
              Ícone
            </span>
            <IconPicker value={novoIcone} onChange={setNovoIcone} />
          </div>
          <div>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
              Imagem personalizada (SVG/PNG) — substitui o ícone
            </span>
            <CategoriaIconUploader value={novoIconeUrl} onChange={setNovoIconeUrl} />
          </div>
          <button
            type="submit"
            disabled={criando}
            className="px-4 py-2 bg-gradient-red shadow-red text-white rounded-md text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
          >
            {criando ? "Salvando…" : "Adicionar"}
          </button>
        </form>

        <div className="pp-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 text-white font-semibold">
            Categorias ({categorias.length})
          </div>
          {isLoading ? (
            <div className="p-5 text-white/60 text-sm">Carregando…</div>
          ) : categorias.length === 0 ? (
            <div className="p-5 text-white/60 text-sm">Nenhuma categoria.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {categorias.map((c) => {
                const editing = editId === c.id;
                return (
                  <li
                    key={c.id}
                    className="px-5 py-3 flex items-center gap-3"
                  >
                    {editing ? (
                      <>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_80px_160px] gap-2">
                          <input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
                          />
                          <input
                            type="number"
                            value={editOrdem}
                            onChange={(e) => setEditOrdem(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
                          />
                          <IconPicker value={editIcone} onChange={setEditIcone} />
                          <div className="md:col-span-3">
                            <CategoriaIconUploader value={editIconeUrl} onChange={setEditIconeUrl} />
                          </div>
                        </div>
                        <button
                          onClick={() => salvarEdicao(c)}
                          className="h-8 w-8 grid place-items-center rounded-md bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/50"
                          aria-label="Salvar"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="h-8 w-8 grid place-items-center rounded-md bg-white/5 text-white/60 hover:text-white"
                          aria-label="Cancelar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const Icon = getCategoriaIcon(c.icone);
                          return (
                            <div className="h-9 w-9 grid place-items-center rounded-md bg-white/5 text-[var(--rota-gold)] shrink-0 overflow-hidden">
                              {c.icone_url ? (
                                <img src={c.icone_url} alt="" className="h-7 w-7 object-contain" />
                              ) : Icon ? (
                                <Icon className="h-4 w-4" />
                              ) : (
                                <span className="text-white/30 text-[10px]">—</span>
                              )}
                            </div>
                          );
                        })()}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {c.label}{" "}
                            {!c.ativo && (
                              <span className="ml-2 text-[10px] uppercase text-amber-400">
                                inativa
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 truncate">
                            {c.value} · ordem {c.ordem}
                          </div>
                        </div>
                        <button
                          onClick={() => update(c.id, { ativo: !c.ativo })}
                          className="h-8 w-8 grid place-items-center rounded-md bg-white/5 text-white/70 hover:text-white"
                          title={c.ativo ? "Desativar" : "Ativar"}
                        >
                          {c.ativo ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => iniciarEdicao(c)}
                          className="h-8 w-8 grid place-items-center rounded-md bg-white/5 text-white/70 hover:text-white"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(c.id, c.label)}
                          className="h-8 w-8 grid place-items-center rounded-md bg-red-600/20 text-red-300 hover:bg-red-600/40"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

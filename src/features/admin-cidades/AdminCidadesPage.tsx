import { useMemo, useState } from "react";
import { Plus, Pencil, Check, X, EyeOff, Eye, Trash2, MapPin, Search } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useFranquia } from "@/hooks/use-franquia";
import { useCidades, type CidadeRow } from "@/hooks/use-cidades";

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function AdminCidadesPage() {
  const { isOwner } = useFranquia();
  const { cidades, isLoading, create, update, remove } = useCidades({
    incluirInativas: true,
  });

  const [novoNome, setNovoNome] = useState("");
  const [novoUf, setNovoUf] = useState("");
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editUf, setEditUf] = useState("");

  const cidadesFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return cidades;
    return cidades.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.uf.toLowerCase().includes(q) ||
        c.slug.includes(q),
    );
  }, [busca, cidades]);

  if (!isOwner) {
    return (
      <AdminShell title="Cidades">
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
          <div className="text-sm text-white/60">
            Apenas o dono da franquia pode gerenciar cidades.
          </div>
        </div>
      </AdminShell>
    );
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault();
    setCriando(true);
    const ok = await create({ nome: novoNome, uf: novoUf });
    setCriando(false);
    if (ok) {
      setNovoNome("");
      setNovoUf("");
    }
  }

  function iniciarEdicao(c: CidadeRow) {
    setEditId(c.id);
    setEditNome(c.nome);
    setEditUf(c.uf);
  }

  async function salvarEdicao(c: CidadeRow) {
    const ok = await update(c.id, { nome: editNome, uf: editUf });
    if (ok) setEditId(null);
  }

  return (
    <AdminShell title="Cidades">
      <div className="max-w-4xl space-y-6">
        <form
          onSubmit={handleCriar}
          className="pp-card rounded-2xl p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-white font-semibold">
            <Plus className="h-4 w-4" /> Nova cidade
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3 items-end">
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
                Nome
              </span>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Ex: Jaraguá do Sul"
                required
                className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-white/50 mb-1">
                UF
              </span>
              <select
                value={novoUf}
                onChange={(e) => setNovoUf(e.target.value)}
                required
                className="w-full bg-black/30 border border-white/10 rounded-md px-3 py-2 text-sm text-white"
              >
                <option value="">—</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={criando}
              className="px-4 py-2 bg-gradient-red shadow-red text-white rounded-md text-xs font-bold uppercase tracking-wider hover:opacity-90 disabled:opacity-50"
            >
              {criando ? "Salvando…" : "Adicionar"}
            </button>
          </div>
          <p className="text-[11px] text-white/40">
            O identificador único (slug) é gerado automaticamente a partir do nome + UF, sem acentos.
          </p>
        </form>

        <div className="pp-card rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
            <div className="text-white font-semibold flex-1">
              Cidades ({cidadesFiltradas.length})
            </div>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar…"
                className="bg-black/30 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-xs text-white w-48"
              />
            </div>
          </div>
          {isLoading ? (
            <div className="p-5 text-white/60 text-sm">Carregando…</div>
          ) : cidadesFiltradas.length === 0 ? (
            <div className="p-5 text-white/60 text-sm">Nenhuma cidade encontrada.</div>
          ) : (
            <ul className="divide-y divide-white/5">
              {cidadesFiltradas.map((c) => {
                const editing = editId === c.id;
                return (
                  <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="h-9 w-9 grid place-items-center rounded-md bg-white/5 text-[var(--rota-gold)] shrink-0">
                      <MapPin className="h-4 w-4" />
                    </div>
                    {editing ? (
                      <>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_100px] gap-2">
                          <input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
                          />
                          <select
                            value={editUf}
                            onChange={(e) => setEditUf(e.target.value)}
                            className="bg-black/30 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
                          >
                            {UFS.map((uf) => (
                              <option key={uf} value={uf}>{uf}</option>
                            ))}
                          </select>
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
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {c.nome} / {c.uf}
                            {!c.ativo && (
                              <span className="ml-2 text-[10px] uppercase text-amber-400">
                                inativa
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/40 truncate">
                            {c.slug}
                          </div>
                        </div>
                        <button
                          onClick={() => update(c.id, { ativo: !c.ativo })}
                          className="h-8 w-8 grid place-items-center rounded-md bg-white/5 text-white/70 hover:text-white"
                          title={c.ativo ? "Desativar" : "Ativar"}
                        >
                          {c.ativo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => iniciarEdicao(c)}
                          className="h-8 w-8 grid place-items-center rounded-md bg-white/5 text-white/70 hover:text-white"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(c.id, c.nome)}
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
          <div className="px-5 py-3 border-t border-white/5 text-[11px] text-white/40">
            Dica: se uma cidade tiver lojas ou entregadores vinculados, prefira <strong>desativar</strong> em vez de excluir — isso a esconde de novos cadastros sem quebrar os registros existentes.
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

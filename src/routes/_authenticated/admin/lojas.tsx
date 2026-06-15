import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { Store, Check, Ban, Trash2, Save, Bike, Circle, Phone, Settings, LayoutGrid, List, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/lojas")({
  component: AdminLojas,
});

type StatusFilter = "todas" | "pendente" | "aprovado" | "bloqueado";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-600/20 text-amber-400" },
  aprovado: { label: "Aprovada", cls: "bg-green-600/20 text-green-500" },
  bloqueado: { label: "Bloqueada", cls: "bg-red-600/20 text-red-400" },
};

function AdminLojas() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [view, setView] = useState<"card" | "list">("card");
  const [search, setSearch] = useState("");

  const { data: lojas, isLoading } = useQuery({
    queryKey: ["admin-lojas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lojas")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const setStatus = async (id: string, status: "aprovado" | "bloqueado") => {
    const { error } = await (supabase as any).from("lojas").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(status === "aprovado" ? "Loja aprovada" : "Loja bloqueada");
      qc.invalidateQueries({ queryKey: ["admin-lojas"] });
    }
  };

  const remove = async (id: string, nome: string) => {
    if (!confirm(`Excluir a loja "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from("lojas").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Loja excluída");
      qc.invalidateQueries({ queryKey: ["admin-lojas"] });
    }
  };

  const normalize = (s: any) => String(s ?? "").toLowerCase();
  const normalizeDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
  const q = search.trim().toLowerCase();
  const qDigits = normalizeDigits(search);

  const filtered = (lojas ?? []).filter((l) => {
    if (filter !== "todas" && l.status !== filter) return false;
    if (!q) return true;
    const textMatch =
      normalize(l.nome).includes(q) ||
      normalize(l.slug).includes(q) ||
      normalize(l.cidade).includes(q) ||
      normalize(l.email).includes(q) ||
      normalize(l.telefone).includes(q) ||
      normalize(l.cnpj).includes(q);
    const digitMatch =
      qDigits.length > 0 &&
      (normalizeDigits(l.cnpj).includes(qDigits) ||
        normalizeDigits(l.telefone).includes(qDigits));
    return textMatch || digitMatch;
  });

  const onChanged = () => qc.invalidateQueries({ queryKey: ["admin-lojas"] });

  return (
    <AdminShell title="Lojas">
      {/* Busca + alternar visualização */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CNPJ, cidade, telefone, email…"
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="inline-flex rounded-md border border-border overflow-hidden self-start">
          <button
            onClick={() => setView("card")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition ${
              view === "card" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition border-l border-border ${
              view === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {(["todas", "pendente", "aprovado", "bloqueado"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition ${
              filter === s ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
            }`}
          >
            {s === "todas" ? "Todas" : STATUS_LABEL[s].label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {view === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => {
            const st = STATUS_LABEL[l.status] ?? STATUS_LABEL.pendente;
            return <LojaCard key={l.id} loja={l} status={st} onSetStatus={setStatus} onRemove={remove} onChanged={onChanged} />;
          })}
          {filtered.length === 0 && !isLoading && (
            <p className="col-span-full text-center text-muted-foreground py-8">Nenhuma loja encontrada.</p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-bold">Loja</th>
                  <th className="text-left px-3 py-2 font-bold">CNPJ</th>
                  <th className="text-left px-3 py-2 font-bold">Cidade</th>
                  <th className="text-left px-3 py-2 font-bold">Telefone</th>
                  <th className="text-left px-3 py-2 font-bold">Status</th>
                  <th className="text-right px-3 py-2 font-bold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const st = STATUS_LABEL[l.status] ?? STATUS_LABEL.pendente;
                  return (
                    <tr key={l.id} className="border-t border-border hover:bg-background/40">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-md bg-gradient-red shadow-red flex items-center justify-center shrink-0">
                            <Store className="h-4 w-4 text-primary-foreground" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{l.nome}</div>
                            <div className="text-[11px] text-muted-foreground truncate">/{l.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{l.cnpj ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{l.cidade ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{l.telefone ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setStatus(l.id, "aprovado")}
                            disabled={l.status === "aprovado"}
                            title="Aprovar"
                            className="p-1.5 rounded bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setStatus(l.id, "bloqueado")}
                            disabled={l.status === "bloqueado"}
                            title="Bloquear"
                            className="p-1.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(l.id, l.nome)}
                            title="Excluir"
                            className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhuma loja encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function LojaCard({ loja: l, status: st, onSetStatus, onRemove, onChanged }: {
  loja: any;
  status: { label: string; cls: string };
  onSetStatus: (id: string, status: "aprovado" | "bloqueado") => void;
  onRemove: (id: string, nome: string) => void;
  onChanged: () => void;
}) {
  const [mensValor, setMensValor] = useState<string>(l.mensalidade_valor != null ? String(l.mensalidade_valor) : "");
  const [diaVenc, setDiaVenc] = useState<string>(l.dia_vencimento_mensalidade != null ? String(l.dia_vencimento_mensalidade) : "");
  const [savingM, setSavingM] = useState(false);
  const [planoAtivo, setPlanoAtivo] = useState<boolean>(!!l.plano_mensal_ativo);
  const [savingPlano, setSavingPlano] = useState(false);
  const [showTarifas, setShowTarifas] = useState(false);

  async function salvarMensalidade() {
    setSavingM(true);
    const patch: any = {
      mensalidade_valor: mensValor === "" ? null : Number(mensValor),
      dia_vencimento_mensalidade: diaVenc === "" ? null : Math.min(Math.max(Number(diaVenc), 1), 28),
    };
    const { error } = await (supabase as any).from("lojas").update(patch).eq("id", l.id);
    setSavingM(false);
    if (error) return toast.error(error.message);
    toast.success("Mensalidade atualizada");
    onChanged();
  }

  async function togglePlano() {
    setSavingPlano(true);
    const novo = !planoAtivo;
    const { error } = await (supabase as any).from("lojas").update({ plano_mensal_ativo: novo }).eq("id", l.id);
    setSavingPlano(false);
    if (error) return toast.error(error.message);
    setPlanoAtivo(novo);
    toast.success(novo ? "Plano mensal ativado — taxa por pedido isenta" : "Plano mensal desativado");
    onChanged();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card flex flex-col">
      {/* Header compacto */}
      <div className="flex items-center gap-3 mb-3">
        <div className="h-11 w-11 rounded-md bg-gradient-red shadow-red flex items-center justify-center shrink-0">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{l.nome}</div>
          <div className="text-xs text-muted-foreground truncate">/{l.slug}</div>
        </div>
      </div>

      {/* Resumo (status + plano) */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}>
          {st.label}
        </span>
        {planoAtivo && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-green-600/20 text-green-500">
            Plano mensal
          </span>
        )}
      </div>

      {/* Info essencial */}
      <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
        <div className="truncate">{l.cidade ?? "—"}</div>
        <div className="truncate">{l.telefone ?? "Sem telefone"}</div>
      </div>

      {/* Resumo de entregadores online */}
      <EntregadoresResumo lojaId={l.id} />

      {/* Botão único para abrir detalhes */}
      <Dialog>
        <DialogTrigger asChild>
          <button className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition">
            <Settings className="h-3.5 w-3.5" /> Gerenciar
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-gradient-red shadow-red flex items-center justify-center shrink-0">
                <Store className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="truncate">{l.nome}</div>
                <div className="text-xs font-normal text-muted-foreground truncate">
                  /{l.slug} • {l.cidade ?? "—"} • {l.telefone ?? "sem telefone"}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Seção: Status */}
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Status da loja</h3>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => onSetStatus(l.id, "aprovado")} disabled={l.status === "aprovado"}
                  className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Check className="h-3.5 w-3.5" /> Aprovar
                </button>
                <button onClick={() => onSetStatus(l.id, "bloqueado")} disabled={l.status === "bloqueado"}
                  className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Ban className="h-3.5 w-3.5" /> Bloquear
                </button>
                <button onClick={() => onRemove(l.id, l.nome)}
                  className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              </div>
            </section>

            {/* Seção: Catálogo público */}
            <section className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Catálogo online</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {l.catalogo_ativo ? `Ativo em /c/${l.catalogo_slug ?? l.slug}` : "Desativado — loja não aparece no catálogo público"}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const { error } = await (supabase as any).from("lojas").update({ catalogo_ativo: !l.catalogo_ativo }).eq("id", l.id);
                    if (error) return toast.error(error.message);
                    toast.success(!l.catalogo_ativo ? "Catálogo ativado" : "Catálogo desativado");
                    onChanged();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${l.catalogo_ativo ? "bg-green-600" : "bg-zinc-600"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${l.catalogo_ativo ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </section>

            {/* Seção: Plano mensal */}
            <section className="border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Plano mensal</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {planoAtivo ? "Isenta da taxa R$ de cada pedido · usa tarifas próprias" : "Cobra taxa por pedido + tarifas globais"}
                  </p>
                </div>
                <button onClick={togglePlano} disabled={savingPlano}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${planoAtivo ? "bg-green-600" : "bg-zinc-600"} disabled:opacity-40`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${planoAtivo ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              {planoAtivo && <TarifasLoja lojaId={l.id} />}
            </section>

            {/* Seção: Mensalidade */}
            <section className="border-t border-border pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Mensalidade desta loja</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Valor (R$)</span>
                  <input type="number" min={0} step="0.01" placeholder="padrão"
                    value={mensValor} onChange={(e) => setMensValor(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 bg-background border border-border rounded text-sm" />
                </label>
                <label className="block">
                  <span className="text-[10px] text-muted-foreground">Vencimento (dia)</span>
                  <input type="number" min={1} max={28} step="1" placeholder="padrão"
                    value={diaVenc} onChange={(e) => setDiaVenc(e.target.value)}
                    className="mt-0.5 w-full px-2 py-1.5 bg-background border border-border rounded text-sm" />
                </label>
              </div>
              <button onClick={salvarMensalidade} disabled={savingM}
                className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold uppercase rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40">
                <Save className="h-3 w-3" /> {savingM ? "Salvando..." : "Salvar mensalidade"}
              </button>
              <p className="text-[10px] text-muted-foreground mt-1">Em branco = usa o valor padrão global.</p>
            </section>

            {/* Seção: Entregadores */}
            <section className="border-t border-border pt-4">
              <EntregadoresDaLoja lojaId={l.id} alwaysOpen />
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Mini resumo de entregadores online — mostrado direto no card. */
function EntregadoresResumo({ lojaId }: { lojaId: string }) {
  const { data } = useQuery({
    queryKey: ["admin-loja-entregadores-resumo", lojaId],
    queryFn: async () => {
      const { data: vinc } = await supabase
        .from("loja_entregadores")
        .select("entregador_id, ativo")
        .eq("loja_id", lojaId)
        .eq("ativo", true);
      const ids = (vinc ?? []).map((v: any) => v.entregador_id);
      if (ids.length === 0) return { total: 0, online: 0 };
      const { data: stat } = await supabase
        .from("entregador_status")
        .select("entregador_id, online")
        .in("entregador_id", ids);
      const online = (stat ?? []).filter((s: any) => s.online).length;
      return { total: ids.length, online };
    },
    refetchInterval: 30_000,
  });
  const total = data?.total ?? 0;
  const online = data?.online ?? 0;
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <Bike className="h-3 w-3" />
      <Circle className={`h-2 w-2 fill-current ${online > 0 ? "text-emerald-500" : "text-gray-500"}`} />
      <span>{online}/{total} entregadores online</span>
    </div>
  );
}

function TarifasLoja({ lojaId }: { lojaId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    faixa_km_min: "0",
    faixa_km_max: "5",
    valor: "8.00",
    valor_minimo: "8.00",
    valor_por_km: "0",
  });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["tarifas-loja", lojaId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("tarifas_loja")
        .select("*")
        .eq("loja_id", lojaId)
        .order("faixa_km_min", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await (supabase as any).from("tarifas_loja").insert({
      loja_id: lojaId,
      tipo_veiculo: "moto",
      faixa_km_min: Number(form.faixa_km_min),
      faixa_km_max: Number(form.faixa_km_max),
      valor: Number(form.valor),
      valor_minimo: Number(form.valor_minimo),
      valor_por_km: Number(form.valor_por_km),
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Tarifa criada");
    qc.invalidateQueries({ queryKey: ["tarifas-loja", lojaId] });
  }

  async function remove(id: string) {
    await (supabase as any).from("tarifas_loja").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["tarifas-loja", lojaId] });
  }

  async function toggle(id: string, ativa: boolean) {
    await (supabase as any).from("tarifas_loja").update({ ativa: !ativa }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["tarifas-loja", lojaId] });
  }

  return (
    <div className="mt-3 p-3 bg-background border border-border rounded-md">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Tarifas desta loja (moto)</div>
      <form onSubmit={add} className="grid grid-cols-5 gap-1.5 mb-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">KM mín</span>
          <input type="number" step="0.1" value={form.faixa_km_min}
            onChange={(e) => setForm({ ...form, faixa_km_min: e.target.value })}
            className="px-1.5 py-1 bg-card border border-border rounded text-[11px]" />
          <span className="text-[9px] text-muted-foreground leading-tight">Início da faixa</span>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">KM máx</span>
          <input type="number" step="0.1" value={form.faixa_km_max}
            onChange={(e) => setForm({ ...form, faixa_km_max: e.target.value })}
            className="px-1.5 py-1 bg-card border border-border rounded text-[11px]" />
          <span className="text-[9px] text-muted-foreground leading-tight">Fim da faixa</span>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Base (R$)</span>
          <input type="number" step="0.01" value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            className="px-1.5 py-1 bg-card border border-border rounded text-[11px]" />
          <span className="text-[9px] text-muted-foreground leading-tight">Preço fixo da faixa</span>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Mínimo (R$)</span>
          <input type="number" step="0.01" value={form.valor_minimo}
            onChange={(e) => setForm({ ...form, valor_minimo: e.target.value })}
            className="px-1.5 py-1 bg-card border border-border rounded text-[11px]" />
          <span className="text-[9px] text-muted-foreground leading-tight">Nunca cobra menos</span>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">R$/km extra</span>
          <input type="number" step="0.01" value={form.valor_por_km}
            onChange={(e) => setForm({ ...form, valor_por_km: e.target.value })}
            className="px-1.5 py-1 bg-card border border-border rounded text-[11px]" />
          <span className="text-[9px] text-muted-foreground leading-tight">Adicional além da faixa</span>
        </label>
        <button disabled={saving} className="col-span-5 px-2 py-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded hover:bg-primary/20 disabled:opacity-40">
          {saving ? "..." : "+ Adicionar faixa"}
        </button>
        <p className="col-span-5 text-[9px] text-muted-foreground font-mono leading-tight">
          total = max(mínimo, base + km_excedente × R$/km)
        </p>
      </form>
      {isLoading ? (
        <p className="text-[10px] text-muted-foreground">Carregando...</p>
      ) : !data || data.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">Nenhuma tarifa. A loja usará as tarifas globais.</p>
      ) : (
        <div className="space-y-1">
          {data.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between text-[11px] bg-card border border-border rounded px-2 py-1">
              <span>{t.faixa_km_min}–{t.faixa_km_max} km · R$ {Number(t.valor).toFixed(2)} (min {Number(t.valor_minimo).toFixed(2)} · {Number(t.valor_por_km).toFixed(2)}/km)</span>
              <div className="flex items-center gap-1">
                <button onClick={() => toggle(t.id, t.ativa)}
                  className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${t.ativa ? "bg-green-600/20 text-green-500" : "bg-zinc-600/20 text-zinc-400"}`}>
                  {t.ativa ? "ON" : "OFF"}
                </button>
                <button onClick={() => remove(t.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EntregadoresDaLoja({ lojaId, alwaysOpen = false }: { lojaId: string; alwaysOpen?: boolean }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-loja-entregadores", lojaId],
    enabled: alwaysOpen,
    queryFn: async () => {
      const { data: vinc, error } = await supabase
        .from("loja_entregadores")
        .select("id, ativo, entregador_id, created_at")
        .eq("loja_id", lojaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = (vinc ?? []).map((v) => v.entregador_id);
      if (ids.length === 0) return [];

      const [{ data: profs }, { data: stat }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase.from("entregador_status").select("entregador_id, online, updated_at").in("entregador_id", ids),
      ]);
      const mapP = new Map((profs ?? []).map((p: any) => [p.id, p]));
      const mapS = new Map((stat ?? []).map((s: any) => [s.entregador_id, s]));
      return (vinc ?? []).map((v) => ({
        vinculo_id: v.id,
        ativo: v.ativo,
        id: v.entregador_id,
        full_name: mapP.get(v.entregador_id)?.full_name ?? null,
        phone: mapP.get(v.entregador_id)?.phone ?? null,
        online: mapS.get(v.entregador_id)?.online ?? false,
      }));
    },
    refetchInterval: alwaysOpen ? 20_000 : false,
  });

  const total = data?.length ?? 0;
  const onlineCount = (data ?? []).filter((e) => e.ativo && e.online).length;

  return (
    <div>
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <Bike className="h-3 w-3" />
        Entregadores vinculados {data ? `(${onlineCount}/${total} online)` : ""}
      </h3>
      <div className="space-y-1.5">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : !data || data.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum entregador vinculado.</p>
        ) : (
          data.map((e) => (
            <div
              key={e.vinculo_id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs border ${
                e.ativo ? "border-border bg-background" : "border-border/50 bg-background/50 opacity-60"
              }`}
            >
              <Circle
                className={`h-2 w-2 fill-current ${
                  e.ativo && e.online ? "text-emerald-500" : "text-gray-400"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{e.full_name ?? "Sem nome"}</div>
                {e.phone && (
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Phone className="h-2.5 w-2.5" />
                    {e.phone}
                  </div>
                )}
              </div>
              <span
                className={`text-[9px] font-bold uppercase ${
                  !e.ativo
                    ? "text-muted-foreground"
                    : e.online
                    ? "text-emerald-500"
                    : "text-gray-400"
                }`}
              >
                {!e.ativo ? "Inativo" : e.online ? "Online" : "Offline"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}



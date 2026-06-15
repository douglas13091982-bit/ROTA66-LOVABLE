import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { AvatarImg } from "@/components/AvatarImg";
import { supabase } from "@/integrations/supabase/client";
import { Bike, Check, Ban, Trash2, MessageCircle, Phone, Car, LayoutGrid, List, Search } from "lucide-react";

function onlyDigits(s: string) {
  return (s ?? "").replace(/\D/g, "");
}
function waLink(phone: string) {
  const d = onlyDigits(phone);
  if (!d) return null;
  const withCountry = d.startsWith("55") ? d : `55${d}`;
  return `https://wa.me/${withCountry}`;
}

export const Route = createFileRoute("/_authenticated/admin/entregadores")({
  component: AdminEntregadores,
});

type StatusFilter = "todas" | "pendente" | "aprovado" | "bloqueado";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-600/20 text-amber-400" },
  aprovado: { label: "Aprovado", cls: "bg-green-600/20 text-green-500" },
  bloqueado: { label: "Bloqueado", cls: "bg-red-600/20 text-red-400" },
};

function AdminEntregadores() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [view, setView] = useState<"card" | "list">("card");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-entregadores"],
    queryFn: async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "entregador");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const [{ data: profiles }, { data: statuses }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        (supabase as any).from("entregador_status_conta").select("*").in("entregador_id", ids),
      ]);
      const stMap = new Map<string, any>((statuses ?? []).map((s: any) => [s.entregador_id, s]));
      return (profiles ?? []).map((p: any) => ({
        ...p,
        status: stMap.get(p.id)?.status ?? "pendente",
      }));
    },
  });

  const setStatus = async (entregador_id: string, status: "aprovado" | "bloqueado") => {
    const { error } = await (supabase as any)
      .from("entregador_status_conta")
      .upsert({ entregador_id, status }, { onConflict: "entregador_id" });
    if (error) toast.error(error.message);
    else {
      toast.success(status === "aprovado" ? "Entregador aprovado" : "Entregador bloqueado");
      qc.invalidateQueries({ queryKey: ["admin-entregadores"] });
    }
  };

  const remove = async (entregador_id: string, nome: string) => {
    if (!confirm(`Remover acesso do entregador "${nome}"? Vínculos com lojas também serão removidos.`)) return;
    await supabase.from("loja_entregadores").delete().eq("entregador_id", entregador_id);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", entregador_id).eq("role", "entregador");
    if (error) {
      toast.error(error.message);
      return;
    }
    await (supabase as any).from("entregador_status_conta").delete().eq("entregador_id", entregador_id);
    toast.success("Entregador removido");
    qc.invalidateQueries({ queryKey: ["admin-entregadores"] });
  };

  const normalize = (s: any) => String(s ?? "").toLowerCase();
  const normalizeDigits = (s: any) => String(s ?? "").replace(/\D/g, "");
  const q = search.trim().toLowerCase();
  const qDigits = normalizeDigits(search);

  const filtered = (data ?? []).filter((p: any) => {
    if (filter !== "todas" && p.status !== filter) return false;
    if (!q) return true;
    const textMatch =
      normalize(p.full_name).includes(q) ||
      normalize(p.email).includes(q) ||
      normalize(p.phone).includes(q);
    const digitMatch = qDigits.length > 0 && normalizeDigits(p.phone).includes(qDigits);
    return textMatch || digitMatch;
  });

  return (
    <AdminShell title="Entregadores">
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone, email…"
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
            {s === "todas" ? "Todos" : STATUS_LABEL[s].label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {view === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p: any) => {
            const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pendente;
            return (
              <div key={p.id} className="bg-card border border-border rounded-lg p-5 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-red shadow-red flex items-center justify-center overflow-hidden">
                    {p.avatar_url ? (
                      <AvatarImg src={p.avatar_url} alt={p.full_name ?? "Entregador"} className="h-full w-full object-cover" fallback={<Bike className="h-6 w-6 text-primary-foreground" />} />
                    ) : (
                      <Bike className="h-6 w-6 text-primary-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">{p.full_name ?? "Sem nome"}</div>
                    {p.phone ? (
                      <a
                        href={`tel:${onlyDigits(p.phone)}`}
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" /> {p.phone}
                      </a>
                    ) : (
                      <div className="text-xs text-muted-foreground">—</div>
                    )}
                    {p.phone && waLink(p.phone) && (
                      <a
                        href={waLink(p.phone)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-green-600/20 text-green-500 hover:bg-green-600/30"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}>
                    {st.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                    p.tipo_veiculo === "carro" ? "bg-blue-600/20 text-blue-400" : "bg-muted text-muted-foreground"
                  }`}>
                    {p.tipo_veiculo === "carro" ? <Car className="h-3 w-3" /> : <Bike className="h-3 w-3" />}
                    {p.tipo_veiculo === "carro" ? "Carro" : "Moto"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setStatus(p.id, "aprovado")}
                    disabled={p.status === "aprovado"}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Check className="h-3.5 w-3.5" /> Aprovar
                  </button>
                  <button
                    onClick={() => setStatus(p.id, "bloqueado")}
                    disabled={p.status === "bloqueado"}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Ban className="h-3.5 w-3.5" /> Bloquear
                  </button>
                  <button
                    onClick={() => remove(p.id, p.full_name ?? "entregador")}
                    className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && !isLoading && (
            <p className="col-span-full text-center text-muted-foreground py-8">Nenhum entregador no filtro.</p>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-bold">Entregador</th>
                  <th className="text-left px-3 py-2 font-bold">Telefone</th>
                  <th className="text-left px-3 py-2 font-bold">Veículo</th>
                  <th className="text-left px-3 py-2 font-bold">Status</th>
                  <th className="text-right px-3 py-2 font-bold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => {
                  const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pendente;
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-background/40">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-gradient-red shadow-red flex items-center justify-center shrink-0 overflow-hidden">
                            {p.avatar_url ? (
                              <AvatarImg src={p.avatar_url} alt={p.full_name ?? "Entregador"} className="h-full w-full object-cover" fallback={<Bike className="h-4 w-4 text-primary-foreground" />} />
                            ) : (
                              <Bike className="h-4 w-4 text-primary-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold truncate">{p.full_name ?? "Sem nome"}</div>
                            <div className="text-[11px] text-muted-foreground truncate">{p.email ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        {p.phone ? (
                          <a href={`tel:${onlyDigits(p.phone)}`} className="hover:text-foreground inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {p.phone}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                          p.tipo_veiculo === "carro" ? "bg-blue-600/20 text-blue-400" : "bg-muted text-muted-foreground"
                        }`}>
                          {p.tipo_veiculo === "carro" ? <Car className="h-3 w-3" /> : <Bike className="h-3 w-3" />}
                          {p.tipo_veiculo === "carro" ? "Carro" : "Moto"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setStatus(p.id, "aprovado")}
                            disabled={p.status === "aprovado"}
                            title="Aprovar"
                            className="p-1.5 rounded bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setStatus(p.id, "bloqueado")}
                            disabled={p.status === "bloqueado"}
                            title="Bloquear"
                            className="p-1.5 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => remove(p.id, p.full_name ?? "entregador")}
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
                    <td colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum entregador no filtro.
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

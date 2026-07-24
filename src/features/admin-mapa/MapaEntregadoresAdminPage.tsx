import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { EntregadoresMapaTempoReal } from "@/components/EntregadoresMapaTempoReal";
import { useEntregadoresLista } from "@/features/admin-dashboard/hooks/use-entregadores-lista";
import { Bike, Search, Phone, Radio, PowerOff, Users } from "lucide-react";

export function MapaEntregadoresAdminPage() {
  const { data, isLoading, onlineCount, total } = useEntregadoresLista();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter(
      (e) =>
        (e.full_name ?? "").toLowerCase().includes(term) ||
        (e.phone ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  const offline = total - onlineCount;

  return (
    <AdminShell title="Mapa">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <EntregadoresMapaTempoReal source="admin" title="Localização em tempo real" />

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Online", value: onlineCount, icon: Radio, color: "text-emerald-500", bar: "bg-emerald-500" },
              { label: "Offline", value: offline, icon: PowerOff, color: "text-gray-400", bar: "bg-gray-400" },
              { label: "Total", value: total, icon: Users, color: "text-primary", bar: "bg-primary" },
            ].map((c) => (
              <div key={c.label} className="bg-card border border-border rounded-lg p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-black tabular-nums">{c.value}</div>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{c.label}</div>
                <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${c.bar}`}
                    style={{ width: total > 0 ? `${Math.round((c.value / total) * 100)}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-0">
        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden flex flex-col lg:absolute lg:inset-0 h-full min-h-0">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="font-display tracking-wide text-lg mb-2">Entregadores</h3>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar entregador..."
                className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
            ) : list.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Nenhum entregador.</div>
            ) : (
              list.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      e.online
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Bike className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{e.full_name ?? "Sem nome"}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          e.online ? "bg-emerald-500" : "bg-gray-400"
                        }`}
                      />
                      {e.online ? "Online" : "Offline"}
                      {e.phone && (
                        <>
                          <span className="opacity-40">•</span>
                          <Phone className="h-2.5 w-2.5" />
                          {e.phone}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </AdminShell>
  );
}

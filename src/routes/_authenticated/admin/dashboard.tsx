import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { isEffectivelyOnline, useOnlineTtlTicker } from "@/lib/entregador-online";
import { Store, Bike, ClipboardList, DollarSign, Circle, Phone, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: AdminDashboard,
});

function Stat({ icon: Icon, label, value, accent, sub }: any) {
  return (
    <div className="pp-card pp-card-hover rounded-2xl p-5 relative overflow-hidden">
      {accent && (
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, oklch(0.78 0.16 75 / 0.16), transparent 70%)" }} />
      )}
      <div className="flex items-start justify-between mb-6">
        <span className="pp-eyebrow">{label}</span>
        <div className={`pp-disc ${accent ? "pp-disc-accent" : ""}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>
      <div className="pp-num text-[34px] text-white">{value}</div>
      {sub && <div className="mt-1.5 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}

function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [lojas, entregadores, pedidos, gmv] = await Promise.all([
        supabase.from("lojas").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "entregador"),
        supabase.from("pedidos").select("*", { count: "exact", head: true }),
        supabase.from("pedidos").select("valor_total").eq("status", "entregue"),
      ]);
      const total = (gmv.data ?? []).reduce((s, p) => s + Number(p.valor_total), 0);
      return {
        lojas: lojas.count ?? 0,
        entregadores: entregadores.count ?? 0,
        pedidos: pedidos.count ?? 0,
        gmv: total,
      };
    },
  });

  return (
    <AdminShell title="Dashboard global">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 pp-stagger">
        <Stat icon={Store} label="Lojas" value={data?.lojas ?? 0} accent sub="Cadastradas na plataforma" />
        <Stat icon={Bike} label="Entregadores" value={data?.entregadores ?? 0} sub="Com perfil ativo" />
        <Stat icon={ClipboardList} label="Pedidos totais" value={data?.pedidos ?? 0} sub="Histórico completo" />
        <Stat icon={DollarSign} label="GMV entregue" value={`R$ ${(data?.gmv ?? 0).toFixed(2)}`} sub="Volume bruto realizado" />
      </div>
      <EntregadoresListaAdmin />
    </AdminShell>
  );
}


type AdminEntregadorItem = {
  id: string;
  full_name: string | null;
  phone: string | null;
  online: boolean;
  lat: number | null;
  lng: number | null;
  updated_at: string | null;
};

function EntregadoresListaAdmin() {
  const qc = useQueryClient();
  const { ttlMin, tick } = useOnlineTtlTicker(20_000);

  useEffect(() => {
    const ch = supabase
      .channel("admin-entregador-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entregador_status" },
        () => qc.invalidateQueries({ queryKey: ["admin-entregadores-lista"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const { data: raw, isLoading } = useQuery({
    queryKey: ["admin-entregadores-lista"],
    queryFn: async () => {
      // Super admin RLS permite ler tudo
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "entregador");

      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [] as AdminEntregadorItem[];

      const [{ data: profiles }, { data: statusList }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, phone").in("id", ids),
        supabase
          .from("entregador_status")
          .select("entregador_id, online, lat, lng, updated_at")
          .in("entregador_id", ids),
      ]);

      const mapProfile = new Map<string, any>();
      for (const p of profiles ?? []) mapProfile.set(p.id, p);
      const mapStatus = new Map<string, any>();
      for (const s of statusList ?? []) mapStatus.set(s.entregador_id, s);

      const result: AdminEntregadorItem[] = ids.map((id) => {
        const p = mapProfile.get(id);
        const st = mapStatus.get(id);
        return {
          id,
          full_name: p?.full_name ?? null,
          phone: p?.phone ?? null,
          online: st?.online ?? false,
          lat: st?.lat ?? null,
          lng: st?.lng ?? null,
          updated_at: st?.updated_at ?? null,
        };
      });
      return result;
    },
    refetchInterval: 30_000,
  });

  // Aplica TTL para "online efetivo"; o `tick` força recálculo periódico.
  const data = (() => {
    void tick;
    const list = (raw ?? []).map((e) => ({
      ...e,
      online: isEffectivelyOnline(e.online, e.updated_at, ttlMin),
    }));
    list.sort((a, b) => Number(b.online) - Number(a.online));
    return list;
  })();


  const onlineCount = (data ?? []).filter((e) => e.online).length;
  const total = (data ?? []).length;

  return (
    <div className="pp-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="pp-disc h-9 w-9"><Bike className="h-[16px] w-[16px]" /></div>
          <div className="min-w-0">
            <div className="pp-eyebrow">Tempo real</div>
            <h3 className="text-[15px] font-semibold text-white tracking-tight mt-0.5 truncate">Entregadores — online / offline</h3>
          </div>
        </div>
        <span className="text-[11px] font-medium text-white/60 flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5 tabular-nums">
          <span className="h-1.5 w-1.5 rounded-full pp-dot-online" />
          {onlineCount} / {total} online
        </span>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="text-sm text-white/50 px-2 py-4">Carregando entregadores…</div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-white/50 px-2 py-6 text-center">Nenhum entregador cadastrado.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.map((e) => (
              <div
                key={e.id}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border transition-all duration-300 ${
                  e.online
                    ? "bg-emerald-500/[0.06] border-emerald-500/25 hover:border-emerald-500/40"
                    : "bg-white/[0.02] border-white/5 hover:border-white/10"
                }`}
              >
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full grid place-items-center text-white" style={{ background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.42 0.20 27))" }}>
                    <Bike className="h-5 w-5" />
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[oklch(0.16_0.015_260)] ${e.online ? "pp-dot-online" : "pp-dot-offline"}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13.5px] text-white truncate tracking-tight">{e.full_name ?? "Entregador"}</div>
                  <div className="flex items-center gap-2 text-[11px] text-white/55 mt-0.5">
                    <span className={`inline-flex items-center gap-1 ${e.online ? "text-emerald-400" : ""}`}>
                      <Circle className={`h-2 w-2 fill-current ${e.online ? "text-emerald-400" : "text-white/30"}`} />
                      {e.online ? "Online" : "Offline"}
                    </span>
                    {e.phone && (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="h-2.5 w-2.5" />
                        {e.phone}
                      </span>
                    )}
                  </div>
                  {e.online && e.lat != null && e.lng != null && (
                    <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5" />
                      GPS ativo
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


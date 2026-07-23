import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Circle, Clock, MapPin, WifiOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeLazy } from "@/lib/realtime-lazy";
import { useAuth } from "@/hooks/use-auth";
import { isEffectivelyOnline, useOnlineTtlTicker } from "@/lib/entregador-online";

function formatRelative(iso: string | null | undefined, now: number): string {
  if (!iso) return "—";
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "—";
  const diff = Math.max(0, Math.floor((now - ts) / 1000));
  if (diff < 5) return "agora mesmo";
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return `há ${Math.floor(diff / 86400)} dias`;
}

function formatHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function EntregadorStatusIndicator() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { ttlMin, tick } = useOnlineTtlTicker(5_000);
  const [now, setNow] = useState(() => Date.now());

  // Atualiza o "há X seg" a cada segundo
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Realtime: sempre que o próprio status mudar no banco, refaz a query
  useEffect(() => {
    if (!user?.id) return;
    return subscribeLazy(
      () =>
        supabase
          .channel(`entregador-self-status-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "entregador_status",
              filter: `entregador_id=eq.${user.id}`,
            },
            () => qc.invalidateQueries({ queryKey: ["entregador-self-status", user.id] })
          )
          .subscribe(),
      () => qc.invalidateQueries({ queryKey: ["entregador-self-status", user.id] }),
    );

  }, [user?.id, qc]);

  const { data } = useQuery({
    queryKey: ["entregador-self-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("entregador_status")
        .select("online, lat, lng, updated_at")
        .eq("entregador_id", user!.id)
        .maybeSingle();
      return data;
    },
    refetchInterval: 15_000,
  });

  void tick;
  const effectiveOnline = isEffectivelyOnline(data?.online, data?.updated_at, ttlMin);
  const hasGps = data?.lat != null && data?.lng != null;

  return (
    <div
      className={`rounded-lg border px-4 py-3 transition-colors ${
        effectiveOnline
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative inline-flex h-3 w-3 items-center justify-center">
            {effectiveOnline && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 animate-ping" />
            )}
            <Circle
              className={`relative h-3 w-3 fill-current ${
                effectiveOnline ? "text-emerald-500" : "text-muted-foreground"
              }`}
            />
          </span>
          <span
            className={`text-sm font-bold uppercase tracking-wider ${
              effectiveOnline ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
            }`}
          >
            {effectiveOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono">
          <Clock className="h-3 w-3" />
          {formatRelative(data?.updated_at, now)}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Último heartbeat:{" "}
          <span className="font-mono text-foreground/80">{formatHora(data?.updated_at)}</span>
        </span>
        {hasGps ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <MapPin className="h-3 w-3" />
            GPS ativo
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <WifiOff className="h-3 w-3" />
            Sem localização
          </span>
        )}
        {!effectiveOnline && data?.online && (
          <span className="text-amber-600 dark:text-amber-400">
            Sem sinal há mais de {ttlMin} min — marcado como offline
          </span>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function useEntregadorStatus() {
  const { user } = useAuth();
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Carrega estado inicial
  useEffect(() => {
    if (!user?.id) return;
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("entregador_status")
        .select("online")
        .eq("entregador_id", user.id)
        .maybeSingle();
      if (cancel) return;
      setOnline(!!data?.online);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  // Loop de heartbeat enquanto online.
  // Importante: o heartbeat é gravado imediatamente, independente do GPS.
  // A localização é apenas um complemento; sem GPS o entregador continua online.
  useEffect(() => {
    if (!online || !user?.id) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    let warned = false;

    // Atualiza apenas heartbeat (sem mexer em lat/lng) quando geo não disponível.
    // Usa upsert para criar a linha se ela ainda não existir. Log de erro
    // para diagnosticar quando a loja vê o entregador offline mesmo com app aberto.
    const heartbeatOnly = async () => {
      const { error } = await supabase.from("entregador_status").upsert(
        { entregador_id: user.id, online: true, updated_at: new Date().toISOString() },
        { onConflict: "entregador_id" }
      );
      if (error) console.error("[heartbeat] falhou:", error);
    };

    // Salva coordenadas + heartbeat
    const upsertComCoords = async (lat: number, lng: number) => {
      const { error } = await supabase.from("entregador_status").upsert(
        { entregador_id: user.id, online: true, lat, lng, updated_at: new Date().toISOString() },
        { onConflict: "entregador_id" }
      );
      if (error) console.error("[heartbeat+coords] falhou:", error);
    };

    const ping = () => {
      // Mantém o status vivo primeiro. Se o GPS demorar, travar ou falhar,
      // o painel ainda recebe um heartbeat recente.
      heartbeatOnly();

      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setGeoError("Geolocalização não suportada neste dispositivo");
        if (!warned) {
          toast.error("Seu navegador não suporta geolocalização — a loja não vai conseguir te ver no mapa.");
          warned = true;
        }
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoError(null);
          upsertComCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? "Permissão de localização negada. Ative para aparecer no mapa."
              : err.code === err.POSITION_UNAVAILABLE
                ? "Localização indisponível no momento."
                : "Não foi possível obter sua localização.";
          setGeoError(msg);
          if (!warned) {
            toast.error(msg);
            warned = true;
          }
          // O heartbeat já foi enviado no início do ping; mantém última lat/lng conhecida.
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    };

    ping();
    timer = setInterval(ping, 30_000);

    const pingWhenVisible = () => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        ping();
      }
    };

    document.addEventListener("visibilitychange", pingWhenVisible);
    window.addEventListener("focus", ping);
    window.addEventListener("pageshow", ping);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", pingWhenVisible);
      window.removeEventListener("focus", ping);
      window.removeEventListener("pageshow", ping);
    };

  }, [online, user?.id]);

  const toggle = async () => {
    if (!user?.id) {
      toast.error("Sessão não carregada — recarregue a página.");
      return;
    }
    const novo = !online;
    setOnline(novo);

    // Ao FICAR OFFLINE: apenas atualiza o status.
    if (!novo) {
      const { error } = await supabase.from("entregador_status").upsert(
        { entregador_id: user.id, online: false, updated_at: new Date().toISOString() },
        { onConflict: "entregador_id" }
      );
      if (error) {
        console.error("[status] falha ao ficar offline:", error);
        toast.error(`Não foi possível salvar offline: ${error.message}`);
        setOnline(true); // rollback
      } else {
        toast.success("Você está offline");
      }
      return;
    }

    // Ao FICAR ONLINE: grava no banco AGORA e CONFIRMA a escrita.
    // Se a escrita falhar, faz rollback do estado local — para o botão
    // não ficar "verde" mentindo que está online enquanto o painel da loja vê offline.
    const { error: upErr } = await supabase.from("entregador_status").upsert(
      { entregador_id: user.id, online: true, updated_at: new Date().toISOString() },
      { onConflict: "entregador_id" }
    );
    if (upErr) {
      console.error("[status] falha ao ficar online:", upErr);
      toast.error(`Não foi possível ficar online: ${upErr.message}`);
      setOnline(false); // rollback
      return;
    }
    toast.success("Você está online — recebendo pedidos");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }

    console.log("[geo] solicitando getCurrentPosition...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        console.log("[geo] sucesso:", pos.coords.latitude, pos.coords.longitude, "accuracy:", pos.coords.accuracy);
        setGeoError(null);
        const { error } = await supabase.from("entregador_status").upsert(
          {
            entregador_id: user.id,
            online: true,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entregador_id" }
        );
        if (error) console.error("[status] falha ao gravar coords:", error);
      },
      (err) => {
        console.error("[geo] erro:", err.code, err.message);
        const msg =
          err.code === err.PERMISSION_DENIED
            ? "Permissão de localização negada. Ative no navegador para aparecer no mapa."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Localização indisponível. Verifique se o GPS está ativo."
              : "Não foi possível obter sua localização (timeout).";
        setGeoError(msg);
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return { online, loading, toggle, geoError };
}

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function useEntregadorStatus() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState<string | null>(null);

  // "Sessão" da fase online atual. Toda escrita assíncrona (heartbeat, geo
  // callback) captura o token no início e só persiste se o token AINDA for
  // o vigente. Isso impede que um ping em voo ressuscite online=true
  // depois que o usuário clicou em offline.
  const sessionRef = useRef(0);
  const onlineRef = useRef(false);
  onlineRef.current = online;

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
      const inicial = !!data?.online;
      setOnline(inicial);
      onlineRef.current = inicial;
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user?.id]);

  // Loop de heartbeat enquanto online. Toda escrita verifica o token de
  // sessão antes de gravar — se o usuário ficou offline no meio do caminho,
  // a escrita é descartada.
  useEffect(() => {
    if (!online || !user?.id) return;
    const mySession = ++sessionRef.current;
    let timer: ReturnType<typeof setInterval> | null = null;
    let warned = false;

    const heartbeatOnly = async () => {
      if (sessionRef.current !== mySession) return;
      const { error } = await supabase.from("entregador_status").upsert(
        { entregador_id: user.id, online: true, updated_at: new Date().toISOString() },
        { onConflict: "entregador_id" }
      );
      if (error) console.error("[heartbeat] falhou:", error);
    };

    const upsertComCoords = async (lat: number, lng: number) => {
      if (sessionRef.current !== mySession) return;
      const { error } = await supabase.from("entregador_status").upsert(
        { entregador_id: user.id, online: true, lat, lng, updated_at: new Date().toISOString() },
        { onConflict: "entregador_id" }
      );
      if (error) console.error("[heartbeat+coords] falhou:", error);
    };

    const ping = () => {
      if (sessionRef.current !== mySession) return;
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
          if (sessionRef.current !== mySession) return;
          setGeoError(null);
          upsertComCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          if (sessionRef.current !== mySession) return;
          // Só avisamos o entregador quando o problema é acionável
          // (permissão negada). Timeout / posição indisponível são comuns
          // em preview/iframe e quando o app está em background — barulho
          // demais para virar toast a cada 30s.
          if (err.code === err.PERMISSION_DENIED) {
            setGeoError("Permissão de localização negada. Ative para aparecer no mapa.");
            if (!warned) {
              toast.error("Permissão de localização negada. Ative para aparecer no mapa.");
              warned = true;
            }
          } else {
            setGeoError(null);
          }
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

    // === FICAR OFFLINE ===
    // 1) Invalida QUALQUER ping/geo em voo (bump da sessão).
    // 2) Atualiza o ref ANTES do await — heartbeats já agendados saem.
    // 3) Persiste online=false no banco e CONFIRMA a escrita.
    // 4) Atualiza o cache do react-query do `entregador-self-status` na hora
    //    para que `usePedidosDisponiveis` esconda os pedidos imediatamente.
    if (!novo) {
      sessionRef.current++; // cancela sessão online atual
      onlineRef.current = false;
      setOnline(false);

      const agora = new Date().toISOString();
      const { error } = await supabase.from("entregador_status").upsert(
        { entregador_id: user.id, online: false, updated_at: agora },
        { onConflict: "entregador_id" }
      );
      if (error) {
        console.error("[status] falha ao ficar offline:", error);
        toast.error(`Não foi possível salvar offline: ${error.message}`);
        onlineRef.current = true;
        setOnline(true); // rollback
        return;
      }

      // Reflete na hora no cache local — sem esperar refetch/realtime.
      qc.setQueryData(["entregador-self-status", user.id], {
        online: false,
        updated_at: agora,
      });
      qc.invalidateQueries({ queryKey: ["pedidos-pool-externo", user.id] });

      toast.success("Você está offline");
      return;
    }

    // === FICAR ONLINE ===
    const agora = new Date().toISOString();
    const { error: upErr } = await supabase.from("entregador_status").upsert(
      { entregador_id: user.id, online: true, updated_at: agora },
      { onConflict: "entregador_id" }
    );
    if (upErr) {
      console.error("[status] falha ao ficar online:", upErr);
      toast.error(`Não foi possível ficar online: ${upErr.message}`);
      return;
    }
    onlineRef.current = true;
    setOnline(true);
    qc.setQueryData(["entregador-self-status", user.id], { online: true, updated_at: agora });
    toast.success("Você está online — recebendo pedidos");

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Seu navegador não suporta geolocalização.");
      return;
    }

    // Se o entregador clicar em offline antes do GPS responder, `onlineRef`
    // já vira false e descartamos o upsert. Não tentamos prever o próximo
    // `sessionRef` — em Android o navegador às vezes responde SÍNCRONO
    // (posição em cache) antes do effect do heartbeat rodar, e a versão
    // antiga (`sessaoCaptura = sessionRef.current + 1`) descartava
    // silenciosamente a 1ª gravação de coords.
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!onlineRef.current) return;
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
        if (!onlineRef.current) return;
        // Só alertamos quando é permissão negada (acionável). Timeout e
        // "posição indisponível" são ruído em preview/iframe.
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError("Permissão de localização negada. Ative no navegador para aparecer no mapa.");
          toast.error("Permissão de localização negada. Ative no navegador para aparecer no mapa.");
        } else {
          setGeoError(null);
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  return { online, loading, toggle, geoError };
}

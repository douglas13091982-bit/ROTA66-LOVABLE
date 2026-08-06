/**
 * Toca o som configurado pelo admin (Sons de alerta → escopo "entregador")
 * quando uma notificação push chega e o app do entregador está aberto.
 *
 * O service worker (`public/sw-push.js`) envia `{ type: "rota66-push" }` para
 * os clients; aqui reproduzimos o MP3 pré-carregado via Web Audio API.
 *
 * Obs.: com o app FECHADO o toque é o do canal de notificação do sistema
 * (Android/Chrome) — a web não permite definir um áudio próprio nesse caso.
 */
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchConfigSom,
  instalarDesbloqueioAutomatico,
  precarregarSom,
  tocarNotificacao,
} from "@/lib/notificacao-som";

const SOM_REFRESH_MS = 30 * 60_000;

export function useSomPush() {
  const { data: somCfg } = useQuery({
    queryKey: ["config-notificacao-som"],
    queryFn: () => fetchConfigSom("push_entregador"),
    staleTime: 60_000,
  });

  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    instalarDesbloqueioAutomatico();
  }, []);

  useEffect(() => {
    if (!somCfg?.audio_path) {
      setPronto(false);
      return;
    }
    let cancel = false;
    precarregarSom(somCfg).then((ok) => {
      if (!cancel) setPronto(ok);
    });
    const id = setInterval(() => precarregarSom(somCfg), SOM_REFRESH_MS);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [somCfg?.audio_path]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    if (!somCfg) return;
    function onMessage(event: MessageEvent) {
      if (event.data?.type !== "rota66-push") return;
      if (somCfg!.audio_path && !pronto) {
        console.warn("[useSomPush] Som ainda não carregado ou falhou:", somCfg!.audio_path);
        // Fallback para o beep se o MP3 falhar
        tocarNotificacao({ ...somCfg!, audio_path: null });
        return;
      }
      tocarNotificacao({ ...somCfg!, repeticoes: 1 });
    }
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [somCfg, pronto]);
}

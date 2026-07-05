/**
 * Hook que controla o popup automático de novos pedidos disponíveis:
 *   - Abre quando o primeiro grupo muda
 *   - Toca o som de notificação configurado pelo admin
 *   - Garante que o som pare quando o popup é fechado/desmontado
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchConfigSom,
  instalarDesbloqueioAutomatico,
  pararNotificacao,
  precarregarSom,
  tocarNotificacao,
} from "@/lib/notificacao-som";
import type { GrupoPedido } from "@/types/pedido";

const SOM_STALE_MS = 60_000;
// A URL assinada do Supabase Storage vive por 1h. Renovamos o pré-carregamento
// bem antes disso para que o <audio> sempre tenha um src válido pronto.
const SOM_REFRESH_MS = 30 * 60_000;

export function usePopupNotificacao(grupos: GrupoPedido[]) {
  const [popupOpen, setPopupOpen] = useState(false);
  const lastSeenKeyRef = useRef<string | null>(null);
  const currentKey = grupos[0]?.key ?? null;

  const { data: somCfg } = useQuery({
    queryKey: ["config-notificacao-som"],
    queryFn: () => fetchConfigSom("entregador"),
    staleTime: SOM_STALE_MS,
  });

  // Instala o "desbloqueio" do áudio no primeiro toque do usuário (Android exige gesto).
  useEffect(() => {
    instalarDesbloqueioAutomatico();
  }, []);

  // Pré-carrega o MP3 assim que a config chega, para o play() ser instantâneo.
  // Reprecarrega periodicamente porque a URL assinada do Storage expira em 1h.
  const [somPronto, setSomPronto] = useState(false);
  useEffect(() => {
    if (!somCfg?.audio_path) {
      setSomPronto(false);
      return;
    }
    let cancel = false;
    setSomPronto(false);
    precarregarSom(somCfg).then((ok) => {
      if (!cancel) setSomPronto(ok);
    });
    const id = setInterval(() => {
      precarregarSom(somCfg);
    }, SOM_REFRESH_MS);
    return () => {
      cancel = true;
      clearInterval(id);
    };
  }, [somCfg?.audio_path]);

  useEffect(() => {
    if (!currentKey) {
      setPopupOpen(false);
      lastSeenKeyRef.current = null;
      return;
    }
    if (currentKey !== lastSeenKeyRef.current) {
      // Espera a config E o pré-carregamento do MP3 antes de tocar. Sem isso,
      // o <audio> ainda não tem src quando play() é chamado e caímos no
      // beep sintético.
      if (!somCfg) return;
      if (somCfg.audio_path && !somPronto) return;
      lastSeenKeyRef.current = currentKey;
      setPopupOpen(true);
      tocarNotificacao(somCfg);
    }
  }, [currentKey, somCfg, somPronto]);

  useEffect(() => () => pararNotificacao(), []);

  return { popupOpen, setPopupOpen };
}

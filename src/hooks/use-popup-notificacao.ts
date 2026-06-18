/**
 * Hook que controla o popup automático de novos pedidos disponíveis:
 *   - Abre quando o primeiro grupo muda
 *   - Toca o som de notificação configurado pelo admin
 *   - Garante que o som pare quando o popup é fechado/desmontado
 */

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DEFAULT_SOM,
  fetchConfigSom,
  instalarDesbloqueioAutomatico,
  pararNotificacao,
  precarregarSom,
  tocarNotificacao,
} from "@/lib/notificacao-som";
import type { GrupoPedido } from "@/types/pedido";

const SOM_STALE_MS = 60_000;

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
  useEffect(() => {
    if (somCfg?.audio_path) {
      precarregarSom(somCfg);
    }
  }, [somCfg?.audio_path]);

  useEffect(() => {
    if (!currentKey) {
      setPopupOpen(false);
      lastSeenKeyRef.current = null;
      return;
    }
    if (currentKey !== lastSeenKeyRef.current) {
      lastSeenKeyRef.current = currentKey;
      setPopupOpen(true);
      tocarNotificacao(somCfg ?? DEFAULT_SOM);
    }
  }, [currentKey, somCfg]);

  useEffect(() => () => pararNotificacao(), []);

  return { popupOpen, setPopupOpen };
}

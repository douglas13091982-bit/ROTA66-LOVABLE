import { useEffect, useRef } from "react";
import {
  DEFAULT_SOM,
  instalarDesbloqueioAutomatico,
  tocarBeepSintetico,
} from "@/lib/notificacao-som";

/**
 * Toca um alerta sonoro no rastreio do cliente no momento exato em que o
 * entregador marca "Cheguei na entrega".
 *
 * O cliente não está autenticado e não tem config de som no banco, então
 * usamos o beep sintético (Web Audio) — não depende de download nem de
 * storage. O áudio só toca se o navegador já tiver sido destravado por
 * algum toque/clique na página (regra de autoplay), por isso instalamos o
 * desbloqueio automático no primeiro gesto.
 */
export function useSomChegada(chegouEntregaAt: string | null | undefined) {
  const anterior = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    instalarDesbloqueioAutomatico();
  }, []);

  useEffect(() => {
    const antes = anterior.current;
    anterior.current = chegouEntregaAt ?? null;
    // Primeira leitura (antes === undefined) nunca toca: evita alarme ao
    // abrir a página com o entregador já no local.
    if (antes === undefined) return;
    if (antes || !chegouEntregaAt) return;

    tocarBeepSintetico({
      ...DEFAULT_SOM,
      volume: 0.7,
      frequencia_inicial: 1046,
      frequencia_final: 660,
      duracao_ms: 260,
      repeticoes: 3,
      intervalo_ms: 140,
      tipo_onda: "sine",
    });

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([200, 120, 200]);
      }
    } catch {
      /* noop */
    }
  }, [chegouEntregaAt]);
}

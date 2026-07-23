/**
 * Lazy Realtime helper.
 *
 * `@supabase/realtime-js` já vem embutido no `@supabase/supabase-js`, então
 * removê-lo do bundle exige aliasar internals do supabase-js — o que quebra
 * `supabase.channel(...)`. O ganho prático e seguro é adiar a criação/subscribe
 * dos canais para fora do critical path:
 *
 * 1. Espera `requestIdleCallback` (fallback `setTimeout 300ms`) — o mount da
 *    rota, os fetches iniciais e a primeira pintura acontecem antes do
 *    handshake WebSocket.
 * 2. Não abre canal em aba oculta (SSR/prerender, tab em background). O canal
 *    sobe automaticamente quando a aba volta a ficar visível.
 * 3. Cleanup cancela o idle callback pendente, evitando abrir canal depois do
 *    unmount em navegações rápidas.
 *
 * Uso:
 *   const stop = subscribeLazy(() => supabase.channel("x").on(...).subscribe());
 *   return stop; // dentro de useEffect
 */
import { supabase } from "@/integrations/supabase/client";

type ChannelLike = { unsubscribe?: () => unknown };

type IdleHandle = number;
type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

const scheduleIdle = (cb: IdleCallback): IdleHandle => {
  if (typeof window === "undefined") return 0 as IdleHandle;
  const ric = (window as unknown as { requestIdleCallback?: (cb: IdleCallback, opts?: { timeout: number }) => IdleHandle })
    .requestIdleCallback;
  if (ric) return ric(cb, { timeout: 1500 });
  return window.setTimeout(() => cb({ didTimeout: true, timeRemaining: () => 0 }), 300) as unknown as IdleHandle;
};

const cancelIdle = (handle: IdleHandle) => {
  if (typeof window === "undefined" || !handle) return;
  const cic = (window as unknown as { cancelIdleCallback?: (h: IdleHandle) => void }).cancelIdleCallback;
  if (cic) cic(handle);
  else window.clearTimeout(handle as unknown as number);
};

/**
 * Adia a criação do canal Realtime para o próximo idle e para quando a aba
 * estiver visível. Retorna uma função de cleanup segura para `useEffect`.
 */
export function subscribeLazy(setup: () => ChannelLike | null | undefined): () => void {
  if (typeof window === "undefined") return () => {};

  let channel: ChannelLike | null = null;
  let cancelled = false;
  let idleHandle: IdleHandle = 0;

  const tryStart = () => {
    if (cancelled || channel) return;
    if (document.visibilityState !== "visible") return;
    idleHandle = scheduleIdle(() => {
      if (cancelled || channel) return;
      try {
        channel = setup() ?? null;
      } catch (err) {
        console.warn("[subscribeLazy] setup falhou:", err);
      }
    });
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") tryStart();
  };

  document.addEventListener("visibilitychange", onVisibility);
  tryStart();

  return () => {
    cancelled = true;
    document.removeEventListener("visibilitychange", onVisibility);
    if (idleHandle) cancelIdle(idleHandle);
    if (channel) {
      try {
        supabase.removeChannel(channel as never);
      } catch {
        /* noop */
      }
      channel = null;
    }
  };
}

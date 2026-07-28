import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Margem antes do vencimento em que já consideramos o token "velho". */
const MARGEM_SEGURANCA_S = 120;

function expiraEm(session: Session | null): number {
  if (!session?.expires_at) return Number.POSITIVE_INFINITY;
  return session.expires_at - Math.floor(Date.now() / 1000);
}

function ehFalhaDeRede(msg: string | undefined) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("network") ||
    m.includes("timeout") ||
    m.includes("load failed")
  );
}

/**
 * Garante que existe uma sessão válida, renovando o token quando ele está
 * perto de vencer.
 *
 * Por que isso existe: em abas abertas por muito tempo (painel da loja fica
 * o dia inteiro aberto) o timer interno de auto-refresh do supabase-js é
 * estrangulado pelo navegador quando a aba fica em segundo plano. O token
 * vence, e qualquer falha momentânea de rede na hora de renovar fazia o
 * supabase limpar a sessão -> usuário "deslogava sozinho".
 *
 * Aqui renovamos de forma proativa e, se a renovação falhar por REDE,
 * devolvemos a sessão atual em vez de tratar como logout.
 *
 * @returns a sessão válida, `null` quando realmente não há sessão, e
 *          `"rede"` quando não deu para confirmar por falha de conexão.
 */
export async function garantirSessaoValida(): Promise<Session | null | "rede"> {
  const { data } = await supabase.auth.getSession();
  const atual = data.session ?? null;

  if (atual && expiraEm(atual) > MARGEM_SEGURANCA_S) return atual;

  let ultimaFalhaDeRede = false;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data: nova, error } = await supabase.auth.refreshSession();
    if (nova?.session) return nova.session;
    ultimaFalhaDeRede = ehFalhaDeRede(error?.message);
    if (!ultimaFalhaDeRede) break;
    await new Promise((r) => setTimeout(r, 400 * (tentativa + 1)));
  }

  if (ultimaFalhaDeRede) return atual ? "rede" : "rede";
  return null;
}

/**
 * Mantém o token sempre renovado enquanto a aba está aberta, sem depender
 * apenas do timer interno do supabase-js (que o navegador estrangula em
 * abas de segundo plano). Retorna a função de limpeza.
 */
export function manterSessaoViva(intervaloMs = 4 * 60 * 1000): () => void {
  if (typeof window === "undefined") return () => {};

  const tick = () => {
    void garantirSessaoValida();
  };

  const timer = window.setInterval(tick, intervaloMs);
  const aoVoltar = () => {
    if (document.visibilityState === "visible") tick();
  };
  document.addEventListener("visibilitychange", aoVoltar);
  window.addEventListener("focus", aoVoltar);
  window.addEventListener("online", tick);
  window.addEventListener("pageshow", aoVoltar);

  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", aoVoltar);
    window.removeEventListener("focus", aoVoltar);
    window.removeEventListener("online", tick);
    window.removeEventListener("pageshow", aoVoltar);
  };
}

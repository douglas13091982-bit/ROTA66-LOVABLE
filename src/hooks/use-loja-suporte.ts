/**
 * Modo "acesso de suporte" — permite ao super admin / adm franqueado
 * abrir o painel de uma loja específica (que não é dele) para dar
 * suporte técnico. O id da loja alvo fica em sessionStorage.
 *
 * As RLS policies (admin_ve_loja) permitem leitura + edição de
 * catálogo/configurações/clientes/endereços de coleta pelo admin.
 * Financeiro e saques continuam restritos ao dono.
 */
import { useEffect, useState } from "react";

const KEY = "admin:loja_suporte_id";
const EVT = "admin:loja-suporte-changed";

export function getLojaSuporteId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLojaSuporteId(lojaId: string) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, lojaId);
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore
  }
}

export function clearLojaSuporteId() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EVT));
  } catch {
    // ignore
  }
}

/** Reactive hook — atualiza componentes quando o id muda. */
export function useLojaSuporteId(): string | null {
  const [id, setId] = useState<string | null>(() => getLojaSuporteId());
  useEffect(() => {
    const handler = () => setId(getLojaSuporteId());
    window.addEventListener(EVT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return id;
}

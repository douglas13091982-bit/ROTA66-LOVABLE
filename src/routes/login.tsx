import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/login/LoginPage";

type LoginSearch = { redirect?: string };

function safeRedirect(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return undefined;
  return s.slice(0, 500);
}

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — ROTA 66" }] }),
  validateSearch: (s: Record<string, unknown>): LoginSearch => {
    const r = safeRedirect(s.redirect);
    return r ? { redirect: r } : {};
  },
  component: LoginPage,
});

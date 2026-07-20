import { createFileRoute } from "@tanstack/react-router";
import { CadastroPage } from "@/features/cadastro/CadastroPage";

export { passwordMeetsRequirements } from "@/features/cadastro/logic/password-rules";

type CadastroSearch = { role?: "cliente" | "loja_admin" | "entregador"; ref?: string; redirect?: string };

function safeRedirect(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return undefined;
  return s.slice(0, 500);
}

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro — ROTA 66" }] }),
  validateSearch: (s: Record<string, unknown>): CadastroSearch => {
    const out: CadastroSearch = {};
    const r = s.role;
    if (r === "cliente" || r === "loja_admin" || r === "entregador") out.role = r;
    const ref = typeof s.ref === "string" ? s.ref.trim().toUpperCase().slice(0, 16) : "";
    if (ref && /^[A-Z0-9]+$/.test(ref)) out.ref = ref;
    const red = safeRedirect(s.redirect);
    if (red) out.redirect = red;
    return out;
  },
  component: CadastroRoute,
});

function CadastroRoute() {
  const { role, ref, redirect } = Route.useSearch();
  return <CadastroPage initialRole={role} refCodigo={ref} redirectTo={redirect} />;
}

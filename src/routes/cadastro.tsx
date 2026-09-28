import { createFileRoute } from "@tanstack/react-router";
import { CadastroPage } from "@/features/cadastro/CadastroPage";

export { passwordMeetsRequirements } from "@/features/cadastro/logic/password-rules";

type CadastroSearch = { role?: "entregador"; ref?: string; redirect?: string };

function safeRedirect(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s.startsWith("/") || s.startsWith("//")) return undefined;
  return s.slice(0, 500);
}

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro de Entregador — ROTA 66" }] }),
  validateSearch: (s: Record<string, unknown>): CadastroSearch => {
    const out: CadastroSearch = { role: "entregador" };
    const ref = typeof s.ref === "string" ? s.ref.trim().toUpperCase().slice(0, 16) : "";
    if (ref && /^[A-Z0-9]+$/.test(ref)) out.ref = ref;
    const red = safeRedirect(s.redirect);
    if (red) out.redirect = red;
    return out;
  },
  component: CadastroRoute,
});

function CadastroRoute() {
  const { ref, redirect } = Route.useSearch();
  return <CadastroPage initialRole="entregador" refCodigo={ref} redirectTo={redirect} />;
}

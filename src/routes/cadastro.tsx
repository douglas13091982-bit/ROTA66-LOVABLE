import { createFileRoute } from "@tanstack/react-router";
import { CadastroPage } from "@/features/cadastro/CadastroPage";

export { passwordMeetsRequirements } from "@/features/cadastro/logic/password-rules";

type CadastroSearch = { role?: "cliente" | "loja_admin" | "entregador"; ref?: string };

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro — ROTA 66" }] }),
  validateSearch: (s: Record<string, unknown>): CadastroSearch => {
    const out: CadastroSearch = {};
    const r = s.role;
    if (r === "cliente" || r === "loja_admin" || r === "entregador") out.role = r;
    const ref = typeof s.ref === "string" ? s.ref.trim().toUpperCase().slice(0, 16) : "";
    if (ref && /^[A-Z0-9]+$/.test(ref)) out.ref = ref;
    return out;
  },
  component: CadastroRoute,
});

function CadastroRoute() {
  const { role, ref } = Route.useSearch();
  return <CadastroPage initialRole={role} refCodigo={ref} />;
}

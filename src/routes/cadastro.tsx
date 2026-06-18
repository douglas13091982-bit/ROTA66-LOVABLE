import { createFileRoute } from "@tanstack/react-router";
import { CadastroPage } from "@/features/cadastro/CadastroPage";

export { passwordMeetsRequirements } from "@/features/cadastro/logic/password-rules";

type CadastroSearch = { role?: "cliente" | "loja_admin" | "entregador" };

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro — ROTA 66" }] }),
  validateSearch: (s: Record<string, unknown>): CadastroSearch => {
    const r = s.role;
    if (r === "cliente" || r === "loja_admin" || r === "entregador") return { role: r };
    return {};
  },
  component: CadastroRoute,
});

function CadastroRoute() {
  const { role } = Route.useSearch();
  return <CadastroPage initialRole={role} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { CadastroPage } from "@/features/cadastro/CadastroPage";

export { passwordMeetsRequirements } from "@/features/cadastro/logic/password-rules";

export const Route = createFileRoute("/cadastro")({
  head: () => ({ meta: [{ title: "Cadastro — ROTA 66" }] }),
  component: CadastroPage,
});

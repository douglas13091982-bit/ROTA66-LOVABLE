import { createFileRoute } from "@tanstack/react-router";
import { FuncionariosPage } from "@/features/loja-funcionarios/FuncionariosPage";

export const Route = createFileRoute("/_authenticated/loja/funcionarios")({
  component: FuncionariosPage,
});

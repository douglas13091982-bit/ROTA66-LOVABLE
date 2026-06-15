import { createFileRoute } from "@tanstack/react-router";
import { PerfilPage } from "@/features/entregador-perfil/PerfilPage";

export const Route = createFileRoute("/_authenticated/entregador/perfil")({
  component: PerfilPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { RevendedorPerfilPage } from "@/features/revendedor-perfil/RevendedorPerfilPage";

export const Route = createFileRoute("/_authenticated/revendedor/perfil")({
  component: RevendedorPerfilPage,
});

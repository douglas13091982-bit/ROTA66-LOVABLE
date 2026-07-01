import { createFileRoute } from "@tanstack/react-router";
import { RevendedorLojasPage } from "@/features/revendedor-lojas/RevendedorLojasPage";

export const Route = createFileRoute("/_authenticated/revendedor/lojas")({
  component: RevendedorLojasPage,
});

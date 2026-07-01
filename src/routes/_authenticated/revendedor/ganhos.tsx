import { createFileRoute } from "@tanstack/react-router";
import { RevendedorGanhosPage } from "@/features/revendedor-ganhos/RevendedorGanhosPage";

export const Route = createFileRoute("/_authenticated/revendedor/ganhos")({
  component: RevendedorGanhosPage,
});

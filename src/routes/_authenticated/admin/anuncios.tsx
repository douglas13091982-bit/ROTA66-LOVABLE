import { createFileRoute } from "@tanstack/react-router";
import { AnunciosPage } from "@/features/admin-anuncios/AnunciosPage";

export const Route = createFileRoute("/_authenticated/admin/anuncios")({
  component: AnunciosPage,
});

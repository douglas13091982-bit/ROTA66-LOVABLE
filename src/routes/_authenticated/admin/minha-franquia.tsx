import { createFileRoute } from "@tanstack/react-router";
import { MinhaFranquiaPage } from "@/features/minha-franquia/MinhaFranquiaPage";

export const Route = createFileRoute("/_authenticated/admin/minha-franquia")({
  component: MinhaFranquiaPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { ConectoresPage } from "@/features/admin-conectores/ConectoresPage";

export const Route = createFileRoute("/_authenticated/admin/conectores")({
  component: ConectoresPage,
});

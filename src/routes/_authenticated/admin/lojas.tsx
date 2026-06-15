import { createFileRoute } from "@tanstack/react-router";
import { LojasPage } from "@/features/admin-lojas/LojasPage";

export const Route = createFileRoute("/_authenticated/admin/lojas")({
  component: LojasPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { RoteirizacaoPage } from "@/features/admin-roteirizacao/RoteirizacaoPage";

export const Route = createFileRoute("/_authenticated/admin/roteirizacao")({
  component: RoteirizacaoPage,
});

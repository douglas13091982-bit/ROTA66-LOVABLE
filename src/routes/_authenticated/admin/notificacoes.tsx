import { createFileRoute } from "@tanstack/react-router";
import { NotificacoesPushPage } from "@/features/admin-push/NotificacoesPushPage";

export const Route = createFileRoute("/_authenticated/admin/notificacoes")({
  component: NotificacoesPushPage,
});

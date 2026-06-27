import { createFileRoute } from "@tanstack/react-router";
import { SaquesEntregadoresPage } from "@/features/admin-saques-entregadores/SaquesEntregadoresPage";

export const Route = createFileRoute("/_authenticated/admin/saques-entregadores")({
  component: SaquesEntregadoresPage,
});

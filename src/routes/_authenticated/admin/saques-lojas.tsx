import { createFileRoute } from "@tanstack/react-router";
import { AdminSaquesLojasPage } from "@/features/admin-saques-lojas/AdminSaquesLojasPage";

export const Route = createFileRoute("/_authenticated/admin/saques-lojas")({
  component: AdminSaquesLojasPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { AdminCategoriasPage } from "@/features/admin-categorias/AdminCategoriasPage";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  component: AdminCategoriasPage,
});

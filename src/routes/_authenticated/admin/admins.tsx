import { createFileRoute } from "@tanstack/react-router";
import { AdminsPage } from "@/features/admin-admins/AdminsPage";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminsPage,
});

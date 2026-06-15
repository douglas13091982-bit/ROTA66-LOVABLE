import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/admin-dashboard/DashboardPage";

export const Route = createFileRoute("/_authenticated/admin/dashboard")({
  component: DashboardPage,
});

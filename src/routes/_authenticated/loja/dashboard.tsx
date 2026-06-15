import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "@/features/loja-dashboard/DashboardPage";

export const Route = createFileRoute("/_authenticated/loja/dashboard")({
  component: DashboardPage,
});

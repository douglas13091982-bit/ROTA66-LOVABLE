import { createFileRoute } from "@tanstack/react-router";
import { CarteirasAdminPage } from "@/features/admin-carteiras/CarteirasAdminPage";

export const Route = createFileRoute("/_authenticated/admin/carteiras")({
  component: CarteirasAdminPage,
});

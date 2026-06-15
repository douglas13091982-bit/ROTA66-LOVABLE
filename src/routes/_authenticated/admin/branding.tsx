import { createFileRoute } from "@tanstack/react-router";
import { BrandingPage } from "@/features/admin-branding/BrandingPage";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  component: BrandingPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { AdminPushTestPage } from "@/features/admin-push-test/AdminPushTestPage";

export const Route = createFileRoute("/_authenticated/admin/push-test")({
  component: AdminPushTestPage,
});

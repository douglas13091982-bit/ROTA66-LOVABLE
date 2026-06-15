import { createFileRoute } from "@tanstack/react-router";
import { AppApkPage } from "@/features/admin-app-apk/AppApkPage";

export const Route = createFileRoute("/_authenticated/admin/app-apk")({
  head: () => ({ meta: [{ title: "App APK — Admin" }] }),
  component: AppApkPage,
});

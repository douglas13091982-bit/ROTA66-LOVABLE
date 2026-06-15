import { createFileRoute } from "@tanstack/react-router";
import { LoginPage } from "@/features/login/LoginPage";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — ROTA 66" }] }),
  component: LoginPage,
});

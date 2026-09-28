import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/loja")({
  beforeLoad: ({ context }) => {
    const ctx = context as { user?: { id: string }; roles?: string[] };
    if (!ctx.user?.id) throw redirect({ to: "/login" });
    const list = ctx.roles ?? [];
    if (list.includes("super_admin") || list.includes("admin")) throw redirect({ to: "/admin/entregadores" });
    if (list.includes("entregador")) throw redirect({ to: "/entregador" });
    throw redirect({ to: "/" });
  },
});

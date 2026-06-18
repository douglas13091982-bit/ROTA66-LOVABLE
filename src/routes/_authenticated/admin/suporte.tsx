import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/AdminShell";
import { SuportePage } from "@/features/suporte/SuportePage";
import { useAuth } from "@/hooks/use-auth";

function Page() {
  const { user } = useAuth();
  return (
    <AdminShell title="Suporte">
      {user ? (
        <SuportePage modo="admin" userId={user.id} />
      ) : (
        <div className="text-white/50 text-sm">Carregando...</div>
      )}
    </AdminShell>
  );
}

export const Route = createFileRoute("/_authenticated/admin/suporte")({
  component: Page,
});

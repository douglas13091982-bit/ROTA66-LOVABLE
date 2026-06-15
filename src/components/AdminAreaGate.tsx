import { type ReactNode } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminPermissoes, type AdminArea } from "@/hooks/use-admin-permissoes";
import { Lock } from "lucide-react";

export function AdminAreaGate({
  area,
  title,
  children,
}: {
  area: AdminArea;
  title: string;
  children: ReactNode;
}) {
  const { loading, can } = useAdminPermissoes();
  if (loading) {
    return (
      <AdminShell title={title}>
        <div className="text-white/60 text-sm">Carregando…</div>
      </AdminShell>
    );
  }
  if (!can(area)) {
    return (
      <AdminShell title={title}>
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <Lock className="h-10 w-10 mx-auto text-white/40 mb-3" />
          <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
          <div className="text-sm text-white/60">
            Você não tem permissão para acessar esta área. Solicite ao super admin.
          </div>
        </div>
      </AdminShell>
    );
  }
  return <>{children}</>;
}

import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/use-auth";
import { useAdmins } from "./hooks/use-admins";
import { ConcederAcessoSection } from "./components/ConcederAcessoSection";
import { AdminsList } from "./components/AdminsList";

export function AdminsPage() {
  const { roles } = useAuth();
  const isSuper = roles.includes("super_admin");
  const { data, isLoading, conceder, revogar } = useAdmins(isSuper);

  if (!isSuper) {
    return (
      <AdminShell title="Administradores">
        <div className="text-white/60">Apenas o super admin pode gerenciar administradores.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Administradores">
      <div className="max-w-4xl space-y-8">
        <ConcederAcessoSection onConceder={conceder.mutate} isPending={conceder.isPending} />
        <AdminsList admins={data} isLoading={isLoading} conceder={conceder} revogar={revogar} />
      </div>
    </AdminShell>
  );
}

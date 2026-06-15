import { Shield } from "lucide-react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { AdminRow, PermState } from "../logic/perms";
import { AdminRowItem } from "./AdminRowItem";

export function AdminsList({
  admins,
  isLoading,
  conceder,
  revogar,
}: {
  admins: AdminRow[] | undefined;
  isLoading: boolean;
  conceder: UseMutationResult<void, unknown, { email: string; perms: PermState }, unknown>;
  revogar: UseMutationResult<void, unknown, string, unknown>;
}) {
  return (
    <section className="pp-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-white/80" />
        <h2 className="text-lg font-semibold text-white">Admins cadastrados</h2>
      </div>
      {isLoading ? (
        <div className="text-white/50 text-sm">Carregando…</div>
      ) : !admins || admins.length === 0 ? (
        <div className="text-white/50 text-sm">Nenhum admin cadastrado ainda.</div>
      ) : (
        <div className="space-y-3">
          {admins.map((a) => (
            <AdminRowItem
              key={a.user_id}
              admin={a}
              onSalvar={(perms) => conceder.mutate({ email: a.email, perms })}
              onRevogar={() => revogar.mutate(a.user_id)}
              salvarPending={conceder.isPending}
              revogarPending={revogar.isPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

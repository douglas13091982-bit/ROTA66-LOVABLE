import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminPlanos } from "./hooks/use-admin-planos";
import { PlanoForm } from "./components/PlanoForm";
import { PlanosTable } from "./components/PlanosTable";
import type { PlanoRow } from "./logic/types";

export function AdminPlanosPage() {
  const { data, isLoading, add, update, toggleAtivo, remove } = useAdminPlanos();
  const [editing, setEditing] = useState<PlanoRow | null>(null);

  return (
    <AdminShell title="Planos das lojas">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl mb-1">Planos das lojas</h1>
          <p className="text-sm text-muted-foreground">
            Crie e configure os planos que aparecem para a loja escolher no momento do cadastro.
          </p>
        </div>

        <PlanoForm
          editing={editing}
          onCancel={() => setEditing(null)}
          onSubmit={async (form) => {
            if (editing) {
              const ok = await update(editing.id, form);
              if (ok) setEditing(null);
              return ok;
            }
            return await add(form);
          }}
        />

        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <PlanosTable
            planos={data ?? []}
            onEdit={(p) => {
              setEditing(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onToggleAtivo={toggleAtivo}
            onRemove={(id) => {
              if (window.confirm("Remover este plano? Lojas que já usam ele não serão afetadas.")) {
                remove(id);
              }
            }}
          />
        )}
      </div>
    </AdminShell>
  );
}

import { AdminShell } from "@/components/AdminShell";
import { useAdminTarifas } from "./hooks/use-admin-tarifas";
import { NovaTarifaForm } from "./components/NovaTarifaForm";
import { TarifasTable } from "./components/TarifasTable";

export function AdminTarifasPage() {
  const { data, isLoading, add, remove, toggle } = useAdminTarifas();

  return (
    <AdminShell title="Tarifas Globais (lojas sem plano)">
      <NovaTarifaForm onSubmit={add} />
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      <TarifasTable tarifas={data ?? []} onToggle={toggle} onRemove={remove} />
    </AdminShell>
  );
}

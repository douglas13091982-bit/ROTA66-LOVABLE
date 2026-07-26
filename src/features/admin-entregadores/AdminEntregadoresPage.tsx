import { useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminEntregadores } from "./hooks/use-admin-entregadores";
import { contarPorVeiculo, filtrarEntregadores } from "./logic/filters";
import type { StatusFilter, VeiculoFilter } from "./logic/types";
import { ToolbarBusca, type ViewMode } from "./components/ToolbarBusca";
import { StatusFilterTabs } from "./components/StatusFilterTabs";
import { VeiculoFilterTabs } from "./components/VeiculoFilterTabs";
import { EntregadoresGrid } from "./components/EntregadoresGrid";
import { EntregadoresTabela } from "./components/EntregadoresTabela";

export function AdminEntregadoresPage() {
  const { data, isLoading, setStatus, remove } = useAdminEntregadores();
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [veiculo, setVeiculo] = useState<VeiculoFilter>("todos");

  const filtered = useMemo(
    () => filtrarEntregadores(data, filter, search, veiculo),
    [data, filter, search, veiculo]
  );

  const veiculoCounts = useMemo(
    () => contarPorVeiculo(filtrarEntregadores(data, filter, search)),
    [data, filter, search]
  );

  return (
    <AdminShell title="Entregadores">


      <ToolbarBusca
        search={search}
        onSearchChange={setSearch}
        view={view}
        onViewChange={setView}
      />
      <StatusFilterTabs filter={filter} onChange={setFilter} />
      <VeiculoFilterTabs filter={veiculo} counts={veiculoCounts} onChange={setVeiculo} />

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {view === "card" ? (
        <EntregadoresGrid
          list={filtered}
          isLoading={isLoading}
          onSetStatus={setStatus}
          onRemove={remove}
        />
      ) : (
        <EntregadoresTabela
          list={filtered}
          isLoading={isLoading}
          onSetStatus={setStatus}
          onRemove={remove}
        />
      )}
    </AdminShell>
  );
}

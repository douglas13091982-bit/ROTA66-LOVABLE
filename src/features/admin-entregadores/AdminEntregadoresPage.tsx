import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useAdminEntregadores } from "./hooks/use-admin-entregadores";
import { useDocsPendentesIds } from "./hooks/use-docs-pendentes-ids";
import { contarPorVeiculo, filtrarEntregadores } from "./logic/filters";
import type { StatusFilter, VeiculoFilter } from "./logic/types";
import { ToolbarBusca, ViewToggle, type ViewMode } from "./components/ToolbarBusca";
import { StatusFilterTabs } from "./components/StatusFilterTabs";
import { VeiculoFilterTabs } from "./components/VeiculoFilterTabs";
import { EntregadoresGrid } from "./components/EntregadoresGrid";
import { EntregadoresTabela } from "./components/EntregadoresTabela";
import { Paginacao } from "./components/Paginacao";
import { FileText } from "lucide-react";

const PER_PAGE = 12;

export function AdminEntregadoresPage() {
  const { data, isLoading, setStatus, remove } = useAdminEntregadores();
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [view, setView] = useState<ViewMode>("card");
  const [search, setSearch] = useState("");
  const [veiculo, setVeiculo] = useState<VeiculoFilter>("todos");
  const [page, setPage] = useState(1);
  const [soDocs, setSoDocs] = useState(false);
  const docsPendentes = useDocsPendentesIds();

  const filtered = useMemo(() => {
    const base = filtrarEntregadores(data, filter, search, veiculo);
    const lista = soDocs ? base.filter((e) => docsPendentes.has(e.id)) : base;
    // Quem tem documento aguardando revisão aparece primeiro.
    return [...lista].sort(
      (a, b) => Number(docsPendentes.has(b.id)) - Number(docsPendentes.has(a.id))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter, search, veiculo, soDocs, docsPendentes.size]);

  const veiculoCounts = useMemo(
    () => contarPorVeiculo(filtrarEntregadores(data, filter, search)),
    [data, filter, search]
  );

  const statusCounts = useMemo(() => {
    const base = filtrarEntregadores(data, "todas", search, veiculo);
    return {
      todas: base.length,
      pendente: base.filter((e) => e.status === "pendente").length,
      aprovado: base.filter((e) => e.status === "aprovado").length,
      bloqueado: base.filter((e) => e.status === "bloqueado").length,
    } as Record<StatusFilter, number>;
  }, [data, search, veiculo]);

  useEffect(() => {
    setPage(1);
  }, [filter, search, veiculo, view, soDocs]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  return (
    <AdminShell title="Entregadores">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Entregadores</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie e acompanhe todos os entregadores da plataforma.
          </p>
        </div>
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
        <ToolbarBusca search={search} onSearchChange={setSearch} />
        <div className="overflow-x-auto">
          <StatusFilterTabs filter={filter} counts={statusCounts} onChange={setFilter} />
        </div>
        <button
          onClick={() => setSoDocs((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
            soDocs
              ? "bg-primary text-primary-foreground border-primary"
              : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-4 w-4" />
          Docs para revisar
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
              soDocs ? "bg-black/20" : "bg-white/[0.06] text-foreground"
            }`}
          >
            {docsPendentes.size}
          </span>
        </button>
      </div>

      <VeiculoFilterTabs filter={veiculo} counts={veiculoCounts} onChange={setVeiculo} />

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {view === "card" ? (
        <EntregadoresGrid
          list={pageItems}
          isLoading={isLoading}
          onSetStatus={setStatus}
          onRemove={remove}
        />
      ) : (
        <EntregadoresTabela
          list={pageItems}
          isLoading={isLoading}
          onSetStatus={setStatus}
          onRemove={remove}
        />
      )}

      <Paginacao
        page={currentPage}
        totalPages={totalPages}
        total={filtered.length}
        from={(currentPage - 1) * PER_PAGE + 1}
        to={Math.min(currentPage * PER_PAGE, filtered.length)}
        onChange={setPage}
      />
    </AdminShell>
  );
}

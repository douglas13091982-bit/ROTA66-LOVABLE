import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useLojas } from "./hooks/use-lojas";
import { filterLojas } from "./logic/filter";
import type { StatusFilter } from "./logic/constants";
import { LojasToolbar } from "./components/LojasToolbar";
import { LojaCard } from "./components/LojaCard";
import { LojasTable } from "./components/LojasTable";

export function LojasPage() {
  const [filter, setFilter] = useState<StatusFilter>("todas");
  const [view, setView] = useState<"card" | "list">("card");
  const [search, setSearch] = useState("");

  const { lojas, isLoading, setStatus, remove, toggleCatalogo, invalidate } =
    useLojas();

  const filtered = filterLojas(lojas, filter, search);

  return (
    <AdminShell title="Lojas">
      <LojasToolbar
        search={search}
        onSearch={setSearch}
        view={view}
        onView={setView}
        filter={filter}
        onFilter={setFilter}
      />

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}

      {view === "card" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <LojaCard
              key={l.id}
              loja={l}
              onSetStatus={setStatus}
              onRemove={remove}
              onToggleCatalogo={toggleCatalogo}
              onChanged={invalidate}
            />
          ))}
          {filtered.length === 0 && !isLoading && (
            <p className="col-span-full text-center text-muted-foreground py-8">
              Nenhuma loja encontrada.
            </p>
          )}
        </div>
      ) : (
        <LojasTable
          lojas={filtered}
          isLoading={isLoading}
          onSetStatus={setStatus}
          onRemove={remove}
        />
      )}
    </AdminShell>
  );
}

import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { useSaquesEntregadores } from "./hooks/use-saques-entregadores";
import { SaquesTable } from "./components/SaquesTable";
import type { SaqueFilter } from "./logic/types";

const TABS: { key: SaqueFilter; label: string }[] = [
  { key: "pendentes", label: "Pendentes" },
  { key: "pagos", label: "Pagos" },
  { key: "rejeitados", label: "Rejeitados" },
  { key: "todos", label: "Todos" },
];

export function SaquesEntregadoresPage() {
  const { saques, isLoading, filter, setFilter, marcarPago, rejeitar } = useSaquesEntregadores();

  return (
    <AdminShell title="Saques dos entregadores">
      <div className="max-w-5xl space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {TABS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? "bg-gradient-red shadow-red text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <SaquesTable
          list={saques}
          isLoading={isLoading}
          onMarcarPago={marcarPago}
          onRejeitar={rejeitar}
        />
      </div>
    </AdminShell>
  );
}

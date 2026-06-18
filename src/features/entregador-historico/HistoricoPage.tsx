import { useState } from "react";
import { EntregadorShell } from "@/components/EntregadorShell";
import { useHistoricoEntregador } from "./hooks/use-historico-entregador";
import { PeriodoToggle } from "./components/PeriodoToggle";
import { ResumoPeriodo } from "./components/ResumoPeriodo";
import { GanhosChart } from "./components/GanhosChart";
import { EntregasList } from "./components/EntregasList";
import { VazioHistorico } from "./components/VazioHistorico";
import type { Periodo } from "./logic/types";

export function HistoricoPage() {
  const [periodo, setPeriodo] = useState<Periodo>("semanal");
  const { isLoading, chartData, totalPeriodo, totalEntregas, listagem } =
    useHistoricoEntregador(periodo);

  return (
    <EntregadorShell title="Histórico">
      <style>{`.panel-premium { background: #0f304d !important; }`}</style>

      <PeriodoToggle periodo={periodo} onChange={setPeriodo} />
      <ResumoPeriodo periodo={periodo} totalPeriodo={totalPeriodo} totalEntregas={totalEntregas} />
      <GanhosChart chartData={chartData} periodo={periodo} />

      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      {!isLoading && listagem.length === 0 && <VazioHistorico periodo={periodo} />}
      {listagem.length > 0 && <EntregasList listagem={listagem} />}
    </EntregadorShell>
  );
}

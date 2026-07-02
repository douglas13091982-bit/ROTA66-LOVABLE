import { AdminShell } from "@/components/AdminShell";
import { useAdminStats } from "./hooks/use-admin-stats";
import { StatsGrid } from "./components/StatsGrid";
import { EntregadoresListaAdmin } from "./components/EntregadoresListaAdmin";
import { ExternalLink } from "lucide-react";

function GeckoApiCard() {
  return (
    <a
      href="https://geckoapi.com.br"
      target="_blank"
      rel="noopener noreferrer"
      className="mb-4 flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-foreground hover:bg-primary/10 transition"
    >
      <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
      <span>
        <b className="text-primary">Integração iFood:</b> acessar o painel da{" "}
        <span className="underline font-semibold">GeckoAPI</span>{" "}
        para copiar a URL do restaurante e importar o catálogo.
      </span>
    </a>
  );
}


export function DashboardPage() {
  const { data } = useAdminStats();
  return (
    <AdminShell title="Dashboard global">
      <StatsGrid stats={data} />
      <EntregadoresListaAdmin />
    </AdminShell>
  );
}

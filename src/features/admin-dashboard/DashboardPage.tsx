import { AdminShell } from "@/components/AdminShell";
import { useAdminStats } from "./hooks/use-admin-stats";
import { StatsGrid } from "./components/StatsGrid";
import { EntregadoresListaAdmin } from "./components/EntregadoresListaAdmin";

export function DashboardPage() {
  const { data } = useAdminStats();
  return (
    <AdminShell title="Dashboard global">
      <StatsGrid stats={data} />
      <EntregadoresListaAdmin />
    </AdminShell>
  );
}

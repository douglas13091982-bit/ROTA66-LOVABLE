import { AdminShell } from "@/components/AdminShell";
import { useAdminPedidos } from "./hooks/use-admin-pedidos";
import { PedidosTable } from "./components/PedidosTable";

export function AdminPedidosPage() {
  const { data, isLoading } = useAdminPedidos();

  return (
    <AdminShell title="Pedidos da Plataforma">
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      <PedidosTable pedidos={data ?? []} />
    </AdminShell>
  );
}

import { AdminShell } from "@/components/AdminShell";
import { PageHeader } from "./components/PageHeader";
import { ConfigForm } from "./components/ConfigForm";

export function NotificacaoSomPage() {
  return (
    <AdminShell title="Som de alerta">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <PageHeader />
        <ConfigForm />
        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
          A nova configuração passa a valer assim que o entregador recarregar a tela
          de pedidos disponíveis.
        </div>
      </div>
    </AdminShell>
  );
}

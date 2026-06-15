import { AdminShell } from "@/components/AdminShell";
import { PageHeader } from "./components/PageHeader";
import { RoteirizacaoForm } from "./components/RoteirizacaoForm";

export function RoteirizacaoPage() {
  return (
    <AdminShell title="Roteirização">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <PageHeader />
        <RoteirizacaoForm />
        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
          As mudanças passam a valer imediatamente nos próximos pedidos atribuídos. Rotas já
          montadas não são reorganizadas.
        </div>
      </div>
    </AdminShell>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/AdminShell";
import { AdminTreinamentoPage } from "@/features/treinamento/AdminTreinamentoPage";

function Page() {
  return (
    <AdminShell title="Treinamento">
      <AdminTreinamentoPage />
    </AdminShell>
  );
}

export const Route = createFileRoute("/_authenticated/admin/treinamento")({
  component: Page,
});

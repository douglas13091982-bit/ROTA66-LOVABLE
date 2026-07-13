import { createFileRoute } from "@tanstack/react-router";
import { LojaShell } from "@/components/LojaShell";
import { TreinamentoLojaPage } from "@/features/treinamento/TreinamentoLojaPage";

function Page() {
  return (
    <LojaShell title="Treinamento">
      <TreinamentoLojaPage />
    </LojaShell>
  );
}

export const Route = createFileRoute("/_authenticated/loja/treinamento")({
  component: Page,
});

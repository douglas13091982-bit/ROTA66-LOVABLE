import { createFileRoute } from "@tanstack/react-router";
import { LojaShell } from "@/components/LojaShell";
import { SuportePage } from "@/features/suporte/SuportePage";
import { useAuth } from "@/hooks/use-auth";
import { useMinhaLoja } from "@/hooks/use-loja";

function Page() {
  const { user } = useAuth();
  const { data: loja } = useMinhaLoja();
  return (
    <LojaShell title="Suporte">
      {user && loja ? (
        <SuportePage modo="loja" userId={user.id} lojaId={loja.id} />
      ) : (
        <div className="text-white/50 text-sm">Carregando...</div>
      )}
    </LojaShell>
  );
}

export const Route = createFileRoute("/_authenticated/loja/suporte")({
  component: Page,
});

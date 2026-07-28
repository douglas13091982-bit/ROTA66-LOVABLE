import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { EntregadoresGrid } from "./components/EntregadoresGrid";
import { VincularEntregadorForm } from "./components/VincularEntregadorForm";
import { useEntregadoresLoja } from "./hooks/use-entregadores-loja";
import { Lock } from "lucide-react";

export function EntregadoresPage() {
  const { data: loja } = useMinhaLoja();
  const { vinculos, isLoading, toggleAtivo, remove, invalidate } = useEntregadoresLoja(loja?.id);

  if (!loja) {
    return (
      <LojaShell title="Entregadores">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  const planoAtivo = temPlanoMensal(loja as LojaPlanoInput);

  return (
    <LojaShell title="Entregadores">


      {planoAtivo ? (
        <VincularEntregadorForm lojaId={loja.id} onDone={invalidate} />
      ) : (
        <div className="bg-card border border-border rounded-lg p-6 shadow-card mb-6 flex items-start gap-4">
          <div className="shrink-0 h-10 w-10 rounded-full bg-yellow-500/15 flex items-center justify-center">
            <Lock className="h-5 w-5 text-yellow-500" />
          </div>
          <div>
            <h2 className="font-display text-xl tracking-wide mb-1">
              Vincular entregadores é exclusivo do Plano Mensal
            </h2>
            <p className="text-sm text-muted-foreground">
              Ative o plano mensal da sua loja em <strong>Financeiro</strong> para
              vincular entregadores próprios. Sem o plano, seus pedidos ficam
              disponíveis no pool de entregadores externos.
            </p>
          </div>
        </div>
      )}
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      <EntregadoresGrid
        vinculos={vinculos}
        onToggleAtivo={toggleAtivo}
        onRemove={remove}
      />
    </LojaShell>
  );
}

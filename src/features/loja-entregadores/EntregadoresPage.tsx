import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { EntregadoresGrid } from "./components/EntregadoresGrid";
import { VincularEntregadorForm } from "./components/VincularEntregadorForm";
import { useEntregadoresLoja } from "./hooks/use-entregadores-loja";

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

  return (
    <LojaShell title="Entregadores">
      <VincularEntregadorForm lojaId={loja.id} onDone={invalidate} />
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      <EntregadoresGrid
        vinculos={vinculos}
        onToggleAtivo={toggleAtivo}
        onRemove={remove}
      />
    </LojaShell>
  );
}

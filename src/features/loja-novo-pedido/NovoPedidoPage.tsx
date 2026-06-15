import { useNavigate } from "@tanstack/react-router";
import { LojaShell } from "@/components/LojaShell";
import { PedidoForm } from "@/components/PedidoForm";
import { useMinhaLoja } from "@/hooks/use-loja";
import { useEnderecosColetaComMatriz } from "./hooks/use-enderecos-coleta-com-matriz";
import { DicaCadastroEndereco } from "./components/DicaCadastroEndereco";

export function NovoPedidoPage() {
  const { data: loja } = useMinhaLoja();
  const navigate = useNavigate();
  const { matrizEndereco, enderecosColeta, enderecosComMatriz } =
    useEnderecosColetaComMatriz(loja);

  if (!loja) {
    return (
      <LojaShell title="Novo Pedido">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  const mostrarDica = !matrizEndereco && enderecosColeta.length === 0;

  return (
    <LojaShell title="Novo Pedido">
      <div className="max-w-2xl space-y-4">
        {mostrarDica && <DicaCadastroEndereco />}
        <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-card">
          <PedidoForm
            lojaId={loja.id}
            taxaBase={Number(loja.taxa_entrega_base) || 0}
            enderecoColetaPadrao={matrizEndereco}
            enderecosColetaSalvos={enderecosComMatriz}
            onSuccess={() => navigate({ to: "/loja/pedidos" })}
          />
        </div>
      </div>
    </LojaShell>
  );
}

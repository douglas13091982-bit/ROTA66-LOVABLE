import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { PedidoForm } from "@/components/PedidoForm";
import { useEnderecosColeta } from "@/components/EnderecosColetaManager";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/loja/novo-pedido")({
  component: NovoPedidoPage,
});

function NovoPedidoPage() {
  const { data: loja } = useMinhaLoja();
  const navigate = useNavigate();
  const { data: enderecosColeta = [] } = useEnderecosColeta(loja?.id);

  if (!loja) {
    return (
      <LojaShell title="Novo Pedido">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  // Monta a lista de coleta começando pela Matriz (endereço da loja).
  // Se nenhum "Outro endereço" estiver marcado como padrão, a Matriz vira o padrão.
  const algumSalvoPadrao = enderecosColeta.some((e) => e.padrao);
  const matrizEndereco = (loja.endereco ?? "").trim();
  const matrizLat = (loja as any).endereco_lat ?? null;
  const matrizLng = (loja as any).endereco_lng ?? null;
  const enderecosComMatriz = matrizEndereco
    ? [
        {
          id: "__matriz__",
          loja_id: loja.id,
          rotulo: "Matriz",
          endereco: matrizEndereco,
          lat: matrizLat,
          lng: matrizLng,
          padrao: !algumSalvoPadrao,
        },
        ...enderecosColeta.map((e) =>
          algumSalvoPadrao ? e : { ...e, padrao: false },
        ),
      ]
    : enderecosColeta;

  return (
    <LojaShell title="Novo Pedido">
      <div className="max-w-2xl space-y-4">
        {!matrizEndereco && enderecosColeta.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-4 shadow-card text-sm">
            <p className="text-muted-foreground">
              💡 Cadastre o endereço da matriz em{" "}
              <Link to="/loja/configuracoes" className="text-primary font-bold hover:underline">
                Configurações
              </Link>{" "}
              ou adicione outros endereços de coleta para selecioná-los rapidamente.
            </p>
          </div>
        )}
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

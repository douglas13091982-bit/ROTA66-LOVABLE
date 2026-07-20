import { PedidoForm } from "@/components/PedidoForm";
import type { LojaPublica } from "../logic/types";

interface Props {
  loja: LojaPublica;
  onSuccess: (numero: number) => void;
}

export function PedidoFormSection({ loja, onSuccess }: Props) {
  const enderecoMatriz = (loja.endereco ?? "").trim();
  const enderecosColetaSalvos = enderecoMatriz
    ? [
        {
          id: "__matriz__",
          rotulo: "Matriz",
          endereco: enderecoMatriz,
          lat: loja.endereco_lat ?? null,
          lng: loja.endereco_lng ?? null,
          padrao: true,
        },
      ]
    : [];

  return (
    <main className="max-w-2xl mx-auto p-6">
      <div className="mb-5">
        <h2 className="font-display text-2xl mb-1">Fazer pedido</h2>
        <p className="text-sm text-muted-foreground">
          Preencha seus dados e os itens desejados.
        </p>
      </div>
      <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-card">
        <PedidoForm
          lojaId={loja.id}
          taxaBase={Number(loja.taxa_entrega_base) || 0}
          enderecoColetaPadrao={enderecoMatriz}
          enderecosColetaSalvos={enderecosColetaSalvos}
          bonusPadrao={
            (loja as any).bonus_entregador_ativo
              ? Number((loja as any).bonus_entregador_valor ?? 0)
              : 0
          }
          asCliente
          onSuccess={onSuccess}
        />
      </div>
    </main>
  );
}

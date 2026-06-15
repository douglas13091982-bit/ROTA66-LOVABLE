import { useState } from "react";
import { useLojaPublica } from "./hooks/use-loja-publica";
import { LojaNaoEncontrada } from "./components/LojaNaoEncontrada";
import { LojaHeader } from "./components/LojaHeader";
import { PedidoSucesso } from "./components/PedidoSucesso";
import { PedidoFormSection } from "./components/PedidoFormSection";

export function LojaPublicaPage({ slug }: { slug: string }) {
  const [sucessoNumero, setSucessoNumero] = useState<number | null>(null);
  const { data: loja, isLoading } = useLojaPublica(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!loja) return <LojaNaoEncontrada />;

  if (sucessoNumero !== null) {
    return <PedidoSucesso numero={sucessoNumero} onNovoPedido={() => setSucessoNumero(null)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <LojaHeader loja={loja} />
      <PedidoFormSection loja={loja} onSuccess={setSucessoNumero} />
    </div>
  );
}

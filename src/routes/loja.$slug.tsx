import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PedidoForm } from "@/components/PedidoForm";
import { MapPin, Phone, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/loja/$slug")({
  component: LojaPublicaPage,
});

function LojaPublicaPage() {
  const { slug } = Route.useParams();
  const [sucessoNumero, setSucessoNumero] = useState<number | null>(null);

  const { data: loja, isLoading } = useQuery({
    queryKey: ["loja-publica", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lojas_publicas")
        .select("id, nome, slug, telefone, endereco, cidade, estado, logo_url, taxa_entrega_base, ativa")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!loja) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-display text-3xl mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground mb-6">Verifique o link e tente novamente.</p>
          <Link to="/" className="text-primary font-bold uppercase tracking-wider hover:underline">Voltar ao início</Link>
        </div>
      </div>
    );
  }

  if (sucessoNumero !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center shadow-card">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="font-display text-3xl mb-2">Pedido enviado!</h1>
          <p className="text-muted-foreground mb-1">Seu pedido</p>
          <p className="font-display text-5xl text-primary mb-4">#{sucessoNumero}</p>
          <p className="text-sm text-muted-foreground mb-6">
            A loja já recebeu seu pedido e entrará em contato pelo telefone informado.
          </p>
          <button
            onClick={() => setSucessoNumero(null)}
            className="w-full px-5 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90"
          >
            Fazer outro pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-2xl mx-auto p-6 flex items-center gap-4">
          {loja.logo_url && <img src={loja.logo_url} alt={loja.nome} className="h-14 w-14 rounded-md object-cover" />}
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-2xl md:text-3xl tracking-wide truncate">{loja.nome}</h1>
            <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
              {loja.endereco && (
                <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {loja.endereco}{loja.cidade ? `, ${loja.cidade}` : ""}{loja.estado ? `/${loja.estado}` : ""}</div>
              )}
              {loja.telefone && (
                <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {loja.telefone}</div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        <div className="mb-5">
          <h2 className="font-display text-2xl mb-1">Fazer pedido</h2>
          <p className="text-sm text-muted-foreground">Preencha seus dados e os itens desejados.</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-card">
          <PedidoForm
            lojaId={loja.id}
            taxaBase={Number(loja.taxa_entrega_base) || 0}
            enderecoColetaPadrao={loja.endereco ?? ""}
            asCliente
            onSuccess={(numero) => setSucessoNumero(numero)}
          />
        </div>
      </main>
    </div>
  );
}

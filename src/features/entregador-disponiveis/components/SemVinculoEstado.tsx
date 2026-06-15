import { Package } from "lucide-react";

export function SemVinculoEstado() {
  return (
    <div className="bg-card border border-border rounded-lg p-12 text-center shadow-card">
      <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <p className="font-display text-2xl tracking-wide mb-2">
        Você ainda não está vinculado a nenhuma loja
      </p>
      <p className="text-muted-foreground text-sm mb-4">
        Peça à loja para te vincular como entregador no painel dela. Assim que vincular,
        os pedidos prontos aparecem aqui em tempo real.
      </p>
      <p className="text-muted-foreground text-sm">
        Ou ative em <strong>Perfil</strong> a opção{" "}
        <em>"Entregador externo"</em> para receber pedidos de lojas sem entregador próprio online.
      </p>
    </div>
  );
}

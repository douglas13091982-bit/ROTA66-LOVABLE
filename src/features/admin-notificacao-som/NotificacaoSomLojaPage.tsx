import { Bell } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { ConfigForm } from "./components/ConfigForm";

export function NotificacaoSomLojaPage() {
  return (
    <AdminShell title="Som de alerta (Loja)">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Notificação sonora da loja
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Esse som toca no painel da loja (tela de Pedidos) quando um novo
            pedido entra — incluindo pedidos vindos do catálogo público.
          </p>
        </div>
        <ConfigForm scope="loja" />
        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
          A nova configuração passa a valer assim que o lojista recarregar a
          tela de pedidos.
        </div>
      </div>
    </AdminShell>
  );
}

import { Bell } from "lucide-react";

export function PageHeader() {
  return (
    <div>
      <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
        <Bell className="h-6 w-6 text-primary" />
        Notificação sonora do entregador
      </h1>
      <p className="text-sm text-muted-foreground mt-1">
        Esse som toca no app do entregador quando um novo pedido aparece. Use o
        botão "Testar" para ouvir antes de salvar.
      </p>
    </div>
  );
}

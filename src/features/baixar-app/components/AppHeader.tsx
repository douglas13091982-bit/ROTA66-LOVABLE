import { Smartphone } from "lucide-react";

export function AppHeader() {
  return (
    <div className="flex flex-col items-center mb-6">
      <div className="h-20 w-20 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
        <Smartphone className="h-10 w-10 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground text-center leading-relaxed">
        Após baixar, abra o arquivo no celular e libere a instalação de fontes desconhecidas se solicitado.
      </p>
    </div>
  );
}

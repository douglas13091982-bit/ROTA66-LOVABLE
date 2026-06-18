import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PerfilDialog } from "@/features/clientes-cidade/components/PerfilDialog";

export function SemCidadeEstado() {
  return (
    <>
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <MapPin className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg tracking-tight mb-2">Endereço não encontrado</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Seu cadastro não possui uma cidade vinculada. Atualize seu endereço para ver as lojas disponíveis.
      </p>
      <PerfilDialog>
        <Button>Atualizar cadastro</Button>
      </PerfilDialog>
    </>
  );
}

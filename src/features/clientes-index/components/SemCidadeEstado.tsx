import { MapPin } from "lucide-react";

export function SemCidadeEstado() {
  return (
    <>
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <MapPin className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg tracking-tight mb-2">Endereço não encontrado</h2>
      <p className="text-sm text-muted-foreground">
        Seu cadastro não possui uma cidade vinculada. Atualize seu endereço no perfil.
      </p>
    </>
  );
}

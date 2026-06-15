import { MapPin } from "lucide-react";

export function GuestEstado() {
  return (
    <>
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <MapPin className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg tracking-tight mb-2">Entre ou cadastre-se</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Faça login para acessar as lojas da sua cidade.
      </p>
      <a
        href="/login"
        className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold"
      >
        Fazer login
      </a>
    </>
  );
}

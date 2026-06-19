import { Link } from "@tanstack/react-router";
import { MapPin, Store, ArrowRight } from "lucide-react";
import { useCidadesDisponiveis } from "@/features/clientes-cidade/hooks/use-cidades-disponiveis";

export function GuestEstado() {
  const { data: cidades = [], isLoading } = useCidadesDisponiveis();

  return (
    <>
      <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Store className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg tracking-tight mb-2">Escolha sua cidade</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Veja as lojas disponíveis na sua região. Faça login depois para pedir.
      </p>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando cidades...</p>
      ) : cidades.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma cidade disponível no momento.
        </p>
      ) : (
        <div className="w-full flex flex-col gap-2 mb-6">
          {cidades.map((c) => (
            <Link
              key={`${c.cidade}-${c.estado ?? ""}`}
              to="/clientes/$cidade"
              params={{ cidade: encodeURIComponent(c.cidade) }}
              search={c.estado ? { uf: c.estado.toUpperCase() } : {}}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted transition text-left"
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                {c.cidade}
                {c.estado && (
                  <span className="text-xs text-muted-foreground uppercase">
                    {c.estado}
                  </span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}

      <a
        href="/login"
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Já tem conta? Fazer login
      </a>
    </>
  );
}

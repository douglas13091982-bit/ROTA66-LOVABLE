import { Link } from "@tanstack/react-router";

export function CatalogoIndisponivel() {
  return (
    <div className="catalogo-clean min-h-screen flex items-center justify-center bg-background p-6">
      <div className="text-center">
        <h1 className="font-display text-3xl mb-2 cc-ink-text">Catálogo indisponível</h1>
        <p className="text-muted-foreground mb-6">Esta loja ainda não liberou o catálogo online.</p>
        <Link to="/" className="text-primary font-semibold uppercase tracking-[0.18em] text-xs hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

import { Link } from "@tanstack/react-router";

export function LojaNaoEncontrada() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="font-display text-3xl mb-2">Loja não encontrada</h1>
        <p className="text-muted-foreground mb-6">Verifique o link e tente novamente.</p>
        <Link to="/" className="text-primary font-bold uppercase tracking-wider hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

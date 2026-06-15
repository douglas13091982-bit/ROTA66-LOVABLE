import { Link } from "@tanstack/react-router";

export function DicaCadastroEndereco() {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card text-sm">
      <p className="text-muted-foreground">
        💡 Cadastre o endereço da matriz em{" "}
        <Link to="/loja/configuracoes" className="text-primary font-bold hover:underline">
          Configurações
        </Link>{" "}
        ou adicione outros endereços de coleta para selecioná-los rapidamente.
      </p>
    </div>
  );
}

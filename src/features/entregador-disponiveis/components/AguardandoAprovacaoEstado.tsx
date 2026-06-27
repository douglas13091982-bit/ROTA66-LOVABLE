import { Clock, ShieldAlert } from "lucide-react";

export function AguardandoAprovacaoEstado({
  bloqueado = false,
}: {
  bloqueado?: boolean;
}) {
  const Icon = bloqueado ? ShieldAlert : Clock;
  const titulo = bloqueado ? "CONTA BLOQUEADA" : "AGUARDANDO APROVAÇÃO";
  const descricao = bloqueado
    ? "Sua conta foi bloqueada pelo administrador. Entre em contato com o suporte para mais informações."
    : "Seu cadastro foi recebido e está em análise. Assim que o administrador aprovar, você começará a receber pedidos por aqui.";
  const cor = bloqueado ? "text-red-500" : "text-amber-500";

  return (
    <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Icon className={`h-8 w-8 ${cor}`} />
      </div>
      <div>
        <p className="font-display text-2xl tracking-wide mb-2">{titulo}</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {descricao}
        </p>
      </div>
    </div>
  );
}

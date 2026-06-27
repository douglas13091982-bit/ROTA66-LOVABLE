import { Clock, ShieldAlert, KeyRound } from "lucide-react";
import { Link } from "@tanstack/react-router";

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
    <div className="space-y-4">
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

      {!bloqueado && (
        <Link
          to="/entregador/perfil"
          className="block rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-5 hover:bg-amber-500/15 transition"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
              <KeyRound className="h-5 w-5 text-amber-500" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                Cadastre sua chave PIX
              </p>
              <p className="text-xs text-muted-foreground">
                Cadastre sua chave PIX antes de ser aprovado para receber seus ganhos
                sem atraso. Toque aqui para ir ao seu perfil.
              </p>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}

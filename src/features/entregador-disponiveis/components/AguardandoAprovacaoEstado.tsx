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
          className="block rounded-2xl border-2 border-red-600 bg-red-600 p-5 text-center hover:bg-red-700 transition"
        >
          <div className="flex items-center justify-center gap-2">
            <KeyRound className="h-5 w-5 text-white" />
            <span className="font-bold text-sm uppercase tracking-wide text-white">
              Cadastrar chave PIX
            </span>
          </div>
          <p className="text-xs text-white/90 mt-2">
            Complete seu cadastro antes da aprovação para receber seus ganhos.
          </p>
        </Link>
      )}
    </div>
  );
}

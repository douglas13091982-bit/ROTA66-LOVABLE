import { FileWarning, Upload, Clock, XCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";


type Props = {
  status: "pendente" | "enviado" | "aprovado" | "rejeitado";
  motivo: string | null;
};

export function AguardandoDocumentosEstado({ status, motivo }: Props) {
  const enviado = status === "enviado";
  const rejeitado = status === "rejeitado";
  const Icon = enviado ? Clock : rejeitado ? XCircle : FileWarning;
  const cor = enviado ? "text-amber-500" : rejeitado ? "text-red-500" : "text-amber-500";
  const titulo = enviado
    ? "DOCUMENTOS EM ANÁLISE"
    : rejeitado
      ? "DOCUMENTOS REJEITADOS"
      : "ENVIE SEUS DOCUMENTOS";
  const descricao = enviado
    ? "Seus documentos foram recebidos e estão sendo analisados. Assim que forem aprovados, você começará a receber pedidos."
    : rejeitado
      ? `Seus documentos foram rejeitados${motivo ? `: ${motivo}` : ""}. Corrija e reenvie para começar a operar.`
      : "Para começar a receber pedidos, envie sua CNH, placa e foto do veículo. Sem isso a plataforma não libera as corridas.";

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Icon className={`h-8 w-8 ${cor}`} />
        </div>
        <div>
          <p className="font-display text-2xl tracking-wide mb-2">{titulo}</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">{descricao}</p>
        </div>
      </div>

      {!enviado && (
        <Link
          to="/entregador/documentos"
          className="block rounded-2xl border-2 border-red-600 bg-red-600 p-5 text-center hover:bg-red-700 transition"
        >
          <div className="flex items-center justify-center gap-2">
            <Upload className="h-5 w-5 text-white" />
            <span className="font-bold text-sm uppercase tracking-wide text-white">
              {rejeitado ? "Reenviar documentos" : "Enviar documentos agora"}
            </span>
          </div>
        </Link>
      )}

      {!enviado && (
        <button
          type="button"
          onClick={() => abrirNoNavegadorExterno("/entregador/documentos")}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition text-sm font-bold"
        >
          <ExternalLink className="h-4 w-4" />
          Se o botão acima não funcionar, abra no navegador
        </button>
      )}

    </div>
  );
}

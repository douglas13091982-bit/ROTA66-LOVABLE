import { Store, LogIn } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { statusOf } from "../logic/constants";
import { EntregadoresResumo } from "./EntregadoresResumo";
import { IndicadoPorBadge } from "./IndicadoPorBadge";
import { LojaManageDialog } from "./LojaManageDialog";
import { setLojaSuporteId } from "@/hooks/use-loja-suporte";

interface Props {
  loja: any;
  onSetStatus: (id: string, status: "aprovado" | "bloqueado") => void;
  onRemove: (id: string, nome: string) => void;
  onToggleCatalogo: (id: string, atual: boolean) => void;
  onChanged: () => void;
}


export function LojaCard({
  loja: l,
  onSetStatus,
  onRemove,
  onToggleCatalogo,
  onChanged,
}: Props) {
  const st = statusOf(l.status);
  const planoAtivo = !!l.plano_mensal_ativo;

  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-card flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-11 w-11 rounded-md bg-gradient-red shadow-red flex items-center justify-center shrink-0">
          <Store className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{l.nome}</div>
          <div className="text-xs text-muted-foreground truncate">/{l.slug}</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span
          className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}
        >
          {st.label}
        </span>
        {planoAtivo && (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-green-600/20 text-green-500">
            Plano mensal
          </span>
        )}
      </div>

      <div className="text-xs text-muted-foreground mb-3 space-y-0.5">
        <div className="truncate">{l.cidade ?? "—"}</div>
        <div className="truncate">{l.telefone ?? "Sem telefone"}</div>
      </div>

      <EntregadoresResumo lojaId={l.id} />

      <IndicadoPorBadge entregadorId={l.indicado_por_entregador_id} />



      <LojaManageDialog
        loja={l}
        onSetStatus={onSetStatus}
        onRemove={onRemove}
        onToggleCatalogo={onToggleCatalogo}
        onChanged={onChanged}
      />
    </div>
  );
}

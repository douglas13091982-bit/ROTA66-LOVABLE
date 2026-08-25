import { ExternalLink, Loader2, MapPin, Phone, Store, X } from "lucide-react";
import type { MeuTurno } from "../logic/types";
import { formatCurrencyValue } from "@/lib/format";

type Props = {
  turno: MeuTurno;
  onDesmarcar: () => void;
  cancelando: boolean;
};

export function TurnoInlineDetails({ turno, onDesmarcar, cancelando }: Props) {
  const loja = turno.lojas;
  const mapsUrl =
    loja?.endereco_lat && loja?.endereco_lng
      ? `https://www.google.com/maps/dir//${loja.endereco_lat},${loja.endereco_lng}`
      : loja?.endereco
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loja.endereco)}`
        : null;
  const telDigits = loja?.telefone?.replace(/\D/g, "") ?? "";

  const totalHoras = Number(turno.duracao_horas || 0) * Number(turno.valor_por_hora || 0);

  return (
    <div className="pb-3 -mx-2 px-2 space-y-3 animate-in fade-in slide-in-from-top-1">
      <div className="h-px bg-border/40" />

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md border border-border/60 bg-background/40 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Horas</div>
          <div className="text-sm font-bold text-emerald-400">
            R$ {formatCurrencyValue(totalHoras)}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-background/40 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Entregas</div>
          <div className="text-sm font-bold text-foreground">{turno.entregas_no_turno}</div>
        </div>
        <div className="rounded-md border border-border/60 bg-background/40 p-2 text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Por entrega
          </div>
          <div className="text-sm font-bold text-emerald-400">
            R$ {formatCurrencyValue(Number(turno.ganho_entregas || 0))}
          </div>
        </div>
      </div>


      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Store className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold">{loja?.nome ?? "Loja"}</span>
        </div>
        {loja?.endereco && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{loja.endereco}</span>
          </div>
        )}
        {loja?.telefone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <a href={`tel:${telDigits}`} className="hover:text-foreground transition-colors">
              {loja.telefone}
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary/15 border border-primary/30 rounded-md text-sm text-primary hover:bg-primary/25 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {telDigits && (
          <a
            href={`https://wa.me/55${telDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-md text-sm text-emerald-400 hover:bg-emerald-500/25 transition-colors"
          >
            <Phone className="h-4 w-4" />
            WhatsApp
          </a>
        )}
      </div>

      {turno.observacoes && (
        <div className="text-sm text-muted-foreground bg-background/40 border border-border/60 rounded-md p-3">
          {turno.observacoes}
        </div>
      )}

      <button
        onClick={onDesmarcar}
        disabled={cancelando}
        className="w-full px-4 py-3 border border-destructive/60 text-white font-bold uppercase tracking-wider text-sm rounded-md hover:bg-destructive/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {cancelando ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <X className="h-4 w-4" />
        )}
        Desmarcar agendamento
      </button>
    </div>
  );
}

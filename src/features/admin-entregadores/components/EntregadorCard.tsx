import { Ban, Bike, Car, Check, MessageCircle, PartyPopper, Phone, Trash2 } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import { mensagemAprovacao, onlyDigits, waLink } from "../logic/filters";
import { STATUS_LABEL, type EntregadorRow, type StatusEntregador } from "../logic/types";

export function EntregadorCard({
  p,
  onSetStatus,
  onRemove,
}: {
  p: EntregadorRow;
  onSetStatus: (id: string, status: StatusEntregador) => void;
  onRemove: (id: string, nome: string) => void;
}) {
  const st = STATUS_LABEL[p.status] ?? STATUS_LABEL.pendente;
  const wa = p.phone ? waLink(p.phone) : null;

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-full bg-gradient-red shadow-red flex items-center justify-center overflow-hidden">
          {p.avatar_url ? (
            <AvatarImg
              src={p.avatar_url}
              alt={p.full_name ?? "Entregador"}
              className="h-full w-full object-cover"
              fallback={<Bike className="h-6 w-6 text-primary-foreground" />}
            />
          ) : (
            <Bike className="h-6 w-6 text-primary-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold truncate">{p.full_name ?? "Sem nome"}</div>
          {p.phone ? (
            <a
              href={`tel:${onlyDigits(p.phone)}`}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Phone className="h-3 w-3" /> {p.phone}
            </a>
          ) : (
            <div className="text-xs text-muted-foreground">—</div>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-green-600/20 text-green-500 hover:bg-green-600/30"
            >
              <MessageCircle className="h-3 w-3" /> WhatsApp
            </a>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${st.cls}`}
        >
          {st.label}
        </span>
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
            p.tipo_veiculo === "carro"
              ? "bg-blue-600/20 text-blue-400"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {p.tipo_veiculo === "carro" ? <Car className="h-3 w-3" /> : <Bike className="h-3 w-3" />}
          {p.tipo_veiculo === "carro" ? "Carro" : "Moto"}
        </span>
        {p.created_at && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Cadastro: {new Date(p.created_at).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onSetStatus(p.id, "aprovado")}
          disabled={p.status === "aprovado"}
          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="h-3.5 w-3.5" /> Aprovar
        </button>
        <button
          onClick={() => onSetStatus(p.id, "bloqueado")}
          disabled={p.status === "bloqueado"}
          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Ban className="h-3.5 w-3.5" /> Bloquear
        </button>
        <button
          onClick={() => onRemove(p.id, p.full_name ?? "entregador")}
          className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>
    </div>
  );
}

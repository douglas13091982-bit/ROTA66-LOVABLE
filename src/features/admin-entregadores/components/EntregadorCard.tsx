import { useEffect, useState } from "react";
import { Ban, Bike, Car, Check, FileSearch, MessageCircle, PartyPopper, Phone, Trash2 } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import { supabase } from "@/integrations/supabase/client";
import { mensagemAprovacao, onlyDigits, waLink } from "../logic/filters";
import { STATUS_LABEL, type EntregadorRow, type StatusEntregador } from "../logic/types";
import { DocumentosReviewDialog } from "./DocumentosReviewDialog";

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
  const waAprovacao =
    p.phone && p.status === "aprovado"
      ? waLink(p.phone, mensagemAprovacao(p.full_name, p.created_at))
      : null;


  const [docStatus, setDocStatus] = useState<string | null>(null);
  const [docTipo, setDocTipo] = useState<string | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  useEffect(() => {
    let ativo = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("entregador_documentos")
        .select("status, tipo_veiculo")
        .eq("entregador_id", p.id)
        .maybeSingle();
      if (ativo) {
        setDocStatus(data?.status ?? null);
        setDocTipo(data?.tipo_veiculo ?? null);
      }
    })();
    return () => { ativo = false; };
  }, [p.id, showDocs]);

  const docLabel: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Docs pendentes", cls: "bg-slate-600/20 text-slate-400" },
    enviado: { label: "Docs enviados", cls: "bg-amber-600/20 text-amber-400" },
    aprovado: { label: "Docs OK", cls: "bg-green-600/20 text-green-500" },
    rejeitado: { label: "Docs rejeitados", cls: "bg-red-600/20 text-red-400" },
  };
  const dl = docStatus ? docLabel[docStatus] : null;
  const precisaRevisar = docStatus === "enviado";

  return (
    <div className="bg-card border border-border rounded-lg p-5 shadow-card">
      {showDocs && (
        <DocumentosReviewDialog
          entregadorId={p.id}
          nome={p.full_name ?? "entregador"}
          onClose={() => setShowDocs(false)}
        />
      )}
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
        {dl && docTipo !== "bike_eletrica" && (
          <span className={`inline-block px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${dl.cls}`}>
            {dl.label}
          </span>
        )}
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md ${
            Number(p.saldo_carteira) > 0
              ? "bg-green-600/20 text-green-500"
              : "bg-muted text-muted-foreground"
          }`}
          title="Saldo disponível na carteira"
        >
          Carteira: {(Number(p.saldo_carteira) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
        {p.created_at && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Cadastro: {new Date(p.created_at).toLocaleDateString("pt-BR")}
          </span>
        )}
      </div>
      {docTipo && docTipo !== "bike_eletrica" && (
        <button
          onClick={() => setShowDocs(true)}
          className={`w-full mb-2 flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold uppercase rounded-md ${
            precisaRevisar
              ? "bg-amber-600 text-white hover:bg-amber-700 animate-pulse"
              : "bg-muted text-foreground hover:bg-muted/70"
          }`}
        >
          <FileSearch className="h-3.5 w-3.5" />
          {precisaRevisar ? "Revisar documentos" : "Ver documentos"}
        </button>
      )}
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
      {waAprovacao && (
        <a
          href={waAprovacao}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-green-600 text-white hover:bg-green-700 transition"
        >
          <PartyPopper className="h-4 w-4" />
          Enviar parabéns pelo WhatsApp
        </a>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Ban, Bike, Check, FileText, MessageCircle, PartyPopper, Phone, Trash2, Wallet } from "lucide-react";
import { AvatarImg } from "@/components/AvatarImg";
import { supabase } from "@/integrations/supabase/client";
import { mensagemAprovacao, onlyDigits, waLink } from "../logic/filters";
import { veiculoInfo } from "../logic/veiculo";
import { STATUS_LABEL, type EntregadorRow, type StatusEntregador } from "../logic/types";
import { DocumentosReviewDialog } from "./DocumentosReviewDialog";
import { formatCurrency, formatDate } from "@/lib/format";

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
    p.phone && p.status === "aprovado" ? waLink(p.phone, mensagemAprovacao(p.full_name)) : null;

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
    return () => {
      ativo = false;
    };
  }, [p.id, showDocs]);

  const docLabel: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Docs pendentes", cls: "bg-slate-600/20 text-slate-400" },
    enviado: { label: "Docs enviados", cls: "bg-amber-600/20 text-amber-400" },
    aprovado: { label: "Docs OK", cls: "bg-green-600/20 text-green-500" },
    rejeitado: { label: "Docs rejeitados", cls: "bg-red-600/20 text-red-400" },
  };
  const dl = docStatus ? docLabel[docStatus] : null;
  const precisaRevisar = docStatus === "enviado";
  const v = veiculoInfo(p.tipo_veiculo ?? docTipo);

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition-shadow duration-200 hover:-translate-y-0.5 transition-transform"
      style={{ boxShadow: "0 10px 30px -8px rgba(15,27,45,0.28), 0 4px 12px -4px rgba(15,27,45,0.18)" }}
    >
      {showDocs && (
        <DocumentosReviewDialog
          entregadorId={p.id}
          nome={p.full_name ?? "entregador"}
          onClose={() => setShowDocs(false)}
        />
      )}

      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="h-14 w-14 rounded-full bg-gradient-red flex items-center justify-center overflow-hidden ring-2 ring-white/10">
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
          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#0b1523] ${
              p.status === "aprovado" ? "bg-green-500" : "bg-zinc-500"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold uppercase tracking-wide truncate">
            {p.full_name ?? "Sem nome"}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {p.phone ? (
              <a
                href={`tel:${onlyDigits(p.phone)}`}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
              >
                <Phone className="h-3.5 w-3.5" /> {p.phone}
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-green-600/15 text-green-400 hover:bg-green-600/25"
              >
                <MessageCircle className="h-3 w-3" /> WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`inline-block px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg ${st.cls}`}
        >
          {st.label}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-white/[0.05] text-muted-foreground">
          <v.Icon className="h-3.5 w-3.5" />
          {v.label}
        </span>
        {dl && docTipo !== "bike_eletrica" && (
          <span
            className={`inline-block px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg ${dl.cls}`}
          >
            {dl.label}
          </span>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2 min-w-0">
          <Wallet className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground">Carteira</div>
            <div className="text-sm font-semibold tabular-nums">
              {formatCurrency(Number(p.saldo_carteira) || 0)}
            </div>
          </div>
        </div>
        {p.created_at && (
          <div className="text-right shrink-0">
            <div className="text-[11px] text-muted-foreground">Cadastro</div>
            <div className="text-sm font-semibold tabular-nums">
              {formatDate(p.created_at)}
            </div>
          </div>
        )}
      </div>

      {docTipo && docTipo !== "bike_eletrica" && (
        <button
          onClick={() => setShowDocs(true)}
          className={`mt-4 w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border transition ${
            precisaRevisar
              ? "bg-amber-600 text-white border-transparent hover:bg-amber-700 animate-pulse"
              : "bg-white/[0.03] text-foreground border-white/10 hover:bg-white/[0.06]"
          }`}
        >
          <FileText className="h-4 w-4" />
          {precisaRevisar ? "Revisar documentos" : "Ver documentos"}
        </button>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          onClick={() => onSetStatus(p.id, "aprovado")}
          disabled={p.status === "aprovado"}
          className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-green-500/40 text-green-400 hover:bg-green-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check className="h-3.5 w-3.5" /> Aprovar
        </button>
        <button
          onClick={() => onSetStatus(p.id, "bloqueado")}
          disabled={p.status === "bloqueado"}
          className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Ban className="h-3.5 w-3.5" /> Bloquear
        </button>
        <button
          onClick={() => onRemove(p.id, p.full_name ?? "entregador")}
          className="flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" /> Excluir
        </button>
      </div>

      {waAprovacao && (
        <a
          href={waAprovacao}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-green-600 text-white hover:bg-green-700 transition"
        >
          <PartyPopper className="h-4 w-4" />
          Enviar parabéns pelo WhatsApp
        </a>
      )}
    </div>
  );
}

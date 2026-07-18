import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileCheck2, FileX2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSignedDocUrl } from "@/features/entregador-documentos/use-entregador-documentos";

type Doc = {
  id: string;
  entregador_id: string;
  tipo_veiculo: string;
  cnh_path: string | null;
  placa: string | null;
  veiculo_foto_path: string | null;
  status: string;
  motivo_rejeicao: string | null;
  submitted_at: string | null;
};

export function DocumentosReviewDialog({
  entregadorId,
  nome,
  onClose,
}: {
  entregadorId: string;
  nome: string;
  onClose: () => void;
}) {
  const [doc, setDoc] = useState<Doc | null>(null);
  const [cnhUrl, setCnhUrl] = useState<string | null>(null);
  const [veicUrl, setVeicUrl] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("entregador_documentos")
        .select("*")
        .eq("entregador_id", entregadorId)
        .maybeSingle();
      if (!data) return;
      setDoc(data);
      if (data.cnh_path) setCnhUrl(await getSignedDocUrl(data.cnh_path));
      if (data.veiculo_foto_path) setVeicUrl(await getSignedDocUrl(data.veiculo_foto_path));
    })();
  }, [entregadorId]);

  const decidir = async (novo: "aprovado" | "rejeitado") => {
    if (novo === "rejeitado" && !motivo.trim()) {
      toast.error("Informe o motivo da rejeição.");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("entregador_documentos")
      .update({ status: novo, motivo_rejeicao: novo === "rejeitado" ? motivo.trim() : null })
      .eq("entregador_id", entregadorId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(novo === "aprovado" ? "Documentos aprovados" : "Documentos rejeitados");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg">Documentos — {nome}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!doc ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : doc.tipo_veiculo === "bike_eletrica" ? (
          <p className="text-sm">Bike elétrica — documentos não são exigidos.</p>
        ) : (
          <div className="space-y-4">
            <div className="text-xs">
              <div><span className="text-muted-foreground">Tipo:</span> <b>{doc.tipo_veiculo}</b></div>
              <div><span className="text-muted-foreground">Placa:</span> <b>{doc.placa ?? "—"}</b></div>
              <div><span className="text-muted-foreground">Status atual:</span> <b>{doc.status}</b></div>
              {doc.submitted_at && (
                <div>
                  <span className="text-muted-foreground">Enviado em:</span>{" "}
                  <b>{new Date(doc.submitted_at).toLocaleString("pt-BR")}</b>
                </div>
              )}
            </div>

            <DocPreview label="CNH" url={cnhUrl} />
            <DocPreview label="Foto do veículo" url={veicUrl} />

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Motivo da rejeição (obrigatório para rejeitar)
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="Ex: CNH ilegível, placa não visível na foto…"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => decidir("aprovado")}
                disabled={saving}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold uppercase rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                <FileCheck2 className="h-4 w-4" /> Aprovar
              </button>
              <button
                onClick={() => decidir("rejeitado")}
                disabled={saving}
                className="flex items-center justify-center gap-1 px-3 py-2 text-xs font-bold uppercase rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                <FileX2 className="h-4 w-4" /> Rejeitar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group">
          <img src={url} alt={label} className="w-full max-h-64 object-contain rounded-md border border-border bg-black/40" />
          <div className="absolute top-2 right-2 bg-black/70 rounded px-2 py-1 text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <ExternalLink className="h-3 w-3" /> Ampliar
          </div>
        </a>
      ) : (
        <div className="text-xs text-muted-foreground italic">Não enviado</div>
      )}
    </div>
  );
}

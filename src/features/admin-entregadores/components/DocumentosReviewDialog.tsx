import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, FileCheck2, FileX2, ExternalLink, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getSignedDocUrl } from "@/features/entregador-documentos/use-entregador-documentos";
import { convertImageToWebp } from "@/lib/image-to-webp";
import { formatDateTime } from "@/lib/format";

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

const BUCKET = "entregador-documentos";

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
  const [placaEdit, setPlacaEdit] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingCnh, setUploadingCnh] = useState(false);
  const [uploadingVeic, setUploadingVeic] = useState(false);
  const [savingPlaca, setSavingPlaca] = useState(false);
  const cnhInputRef = useRef<HTMLInputElement>(null);
  const veicInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const { data } = await (supabase as any)
      .from("entregador_documentos")
      .select("*")
      .eq("entregador_id", entregadorId)
      .maybeSingle();
    if (!data) return;
    setDoc(data);
    setPlacaEdit(data.placa ?? "");
    setCnhUrl(data.cnh_path ? await getSignedDocUrl(data.cnh_path) : null);
    setVeicUrl(data.veiculo_foto_path ? await getSignedDocUrl(data.veiculo_foto_path) : null);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entregadorId]);

  const uploadDoc = async (file: File, prefixo: "cnh" | "veiculo") => {
    const webp = await convertImageToWebp(file, { maxDimension: 1600, quality: 0.82 }).catch(() => file);
    const path = `${entregadorId}/${prefixo}-${Date.now()}.webp`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, webp, {
      upsert: true,
      contentType: "image/webp",
    });
    if (upErr) throw upErr;
    const patch: any = prefixo === "cnh" ? { cnh_path: path } : { veiculo_foto_path: path };
    if (doc?.status === "pendente" || doc?.status === "rejeitado") {
      patch.status = "enviado";
      patch.motivo_rejeicao = null;
      patch.submitted_at = new Date().toISOString();
    }
    const { error } = await (supabase as any)
      .from("entregador_documentos")
      .update(patch)
      .eq("entregador_id", entregadorId);
    if (error) throw error;
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, prefixo: "cnh" | "veiculo") => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const setter = prefixo === "cnh" ? setUploadingCnh : setUploadingVeic;
    setter(true);
    try {
      await uploadDoc(file, prefixo);
      toast.success(prefixo === "cnh" ? "CNH enviada" : "Foto do veículo enviada");
      await refresh();
    } catch (err: any) {
      toast.error(err?.message ?? "Falha no upload");
    } finally {
      setter(false);
    }
  };

  const salvarPlaca = async () => {
    const nova = placaEdit.trim().toUpperCase();
    if (!nova) return toast.error("Informe a placa");
    setSavingPlaca(true);
    const { error } = await (supabase as any)
      .from("entregador_documentos")
      .update({ placa: nova })
      .eq("entregador_id", entregadorId);
    setSavingPlaca(false);
    if (error) return toast.error(error.message);
    toast.success("Placa salva");
    refresh();
  };

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

  const isBike = doc?.tipo_veiculo === "bike_eletrica";

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full my-auto max-h-[90vh] overflow-y-auto"
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
        ) : isBike ? (
          <p className="text-sm">Bike elétrica — documentos não são exigidos.</p>
        ) : (
          <div className="space-y-4">
            <div className="text-xs space-y-1">
              <div><span className="text-muted-foreground">Tipo:</span> <b>{doc.tipo_veiculo}</b></div>
              <div><span className="text-muted-foreground">Status atual:</span> <b>{doc.status}</b></div>
              {doc.submitted_at && (
                <div>
                  <span className="text-muted-foreground">Enviado em:</span>{" "}
                  <b>{formatDateTime(doc.submitted_at)}</b>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Placa</label>
              <div className="flex gap-2">
                <input
                  value={placaEdit}
                  onChange={(e) => setPlacaEdit(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="ABC1D23"
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
                />
                <button
                  onClick={salvarPlaca}
                  disabled={savingPlaca || placaEdit.trim() === (doc.placa ?? "")}
                  className="px-3 py-2 text-xs font-bold uppercase rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                >
                  {savingPlaca ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </button>
              </div>
            </div>

            <DocPreview
              label="CNH"
              url={cnhUrl}
              uploading={uploadingCnh}
              onPick={() => cnhInputRef.current?.click()}
            />
            <input ref={cnhInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, "cnh")} />

            <DocPreview
              label="Foto do veículo"
              url={veicUrl}
              uploading={uploadingVeic}
              onPick={() => veicInputRef.current?.click()}
            />
            <input ref={veicInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, "veiculo")} />

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
    </div>,
    document.body
  );
}

function DocPreview({
  label,
  url,
  uploading,
  onPick,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onPick: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <button
          onClick={onPick}
          disabled={uploading}
          className="flex items-center gap-1 text-[10px] uppercase font-bold text-primary hover:underline disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
          {url ? "Substituir" : "Enviar"}
        </button>
      </div>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="block relative group">
          <img src={url} alt={label} className="w-full max-h-64 object-contain rounded-md border border-border bg-black/40" />
          <div className="absolute top-2 right-2 bg-black/70 rounded px-2 py-1 text-[10px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <ExternalLink className="h-3 w-3" /> Ampliar
          </div>
        </a>
      ) : (
        <div className="text-xs text-muted-foreground italic border border-dashed border-border rounded-md px-3 py-4 text-center">
          Nenhum arquivo enviado
        </div>
      )}
    </div>
  );
}

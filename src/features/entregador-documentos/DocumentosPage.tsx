import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck, Upload, AlertTriangle, CheckCircle2, Clock, ExternalLink, Camera, ImageIcon } from "lucide-react";
import { EntregadorShell } from "@/components/EntregadorShell";
import { abrirNoNavegadorExterno } from "@/lib/abrir-navegador-externo";
import { useEntregadorDocumentos } from "./use-entregador-documentos";


export function DocumentosPage() {
  const { data, isLoading, submit, enviando } = useEntregadorDocumentos();
  const [cnhFile, setCnhFile] = useState<File | null>(null);
  const [veiculoFile, setVeiculoFile] = useState<File | null>(null);
  const [placa, setPlaca] = useState("");

  if (isLoading || !data) {
    return (
      <EntregadorShell title="Documentos">
        <p className="text-sm text-white/60">Carregando…</p>
      </EntregadorShell>
    );
  }

  if (data.tipo_veiculo === "bike_eletrica") {
    return (
      <EntregadorShell title="Documentos">
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-3">
          <ShieldCheck className="h-10 w-10 mx-auto text-green-500" />
          <p className="font-display text-lg">Nenhum documento necessário</p>
          <p className="text-sm text-muted-foreground">
            Entregadores de bike elétrica não precisam enviar documentos adicionais.
          </p>
        </div>
      </EntregadorShell>
    );
  }

  const bloqueadoEdicao = data.status === "aprovado" || data.status === "enviado";
  const veiculoLabel = data.tipo_veiculo === "carro" ? "carro" : "moto";

  const placaAtual = placa || data.placa || "";

  return (
    <EntregadorShell title="Documentos">
      <div className="space-y-4">
        <Link
          to="/entregador/perfil"
          className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>

        <StatusBanner status={data.status} motivo={data.motivo_rejeicao} />

        {!bloqueadoEdicao && (
          <button
            type="button"
            onClick={() => abrirNoNavegadorExterno("/entregador/documentos")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-blue-500/50 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 transition text-sm font-bold"
          >
            <ExternalLink className="h-4 w-4" />
            Não consegue anexar? Abrir no navegador
          </button>
        )}



        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit({ cnhFile, veiculoFile, placa: placaAtual });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-[11px] uppercase tracking-[0.22em] font-extrabold mb-1.5 text-red-600 dark:text-yellow-400">
              Placa do {veiculoLabel}
            </label>
            <input
              type="text"
              value={placaAtual}
              onChange={(e) => setPlaca(e.target.value.toUpperCase().slice(0, 7))}
              placeholder="AAA0A00 ou AAA0000"
              disabled={bloqueadoEdicao}
              className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground disabled:opacity-60 uppercase tracking-widest font-bold"
              maxLength={7}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Formato Mercosul (AAA1A23) ou antigo (AAA1234).
            </p>
          </div>

          <FieldFile
            label="Foto da CNH (frente, legível)"
            file={cnhFile}
            atual={data.cnh_path}
            onChange={setCnhFile}
            disabled={bloqueadoEdicao}
          />

          <FieldFile
            label={`Foto do ${veiculoLabel} (traseira, com placa visível)`}
            file={veiculoFile}
            atual={data.veiculo_foto_path}
            onChange={setVeiculoFile}
            disabled={bloqueadoEdicao}
          />


          {!bloqueadoEdicao && (
            <button
              type="submit"
              disabled={enviando}
              className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {enviando ? "Enviando…" : data.status === "rejeitado" ? "Reenviar documentos" : "Enviar para aprovação"}
            </button>
          )}
        </form>
      </div>
    </EntregadorShell>
  );
}

function StatusBanner({ status, motivo }: { status: string; motivo: string | null }) {
  if (status === "aprovado") {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-green-500">Documentos aprovados</p>
          <p className="text-xs text-muted-foreground mt-0.5">Você já pode receber pedidos normalmente.</p>
        </div>
      </div>
    );
  }
  if (status === "enviado") {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-amber-500">Em análise</p>
          <p className="text-xs text-muted-foreground mt-0.5">Seus documentos foram enviados e estão aguardando aprovação.</p>
        </div>
      </div>
    );
  }
  if (status === "rejeitado") {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-sm text-red-500">Documentos rejeitados</p>
          {motivo && <p className="text-xs text-white/80 mt-1"><b>Motivo:</b> {motivo}</p>}
          <p className="text-xs text-muted-foreground mt-1">Corrija e reenvie abaixo.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-sm">Envie seus documentos para começar a receber pedidos.</p>
    </div>
  );
}

function FieldFile({
  label,
  file,
  atual,
  onChange,
  disabled,
}: {
  label: string;
  file: File | null;
  atual: string | null;
  onChange: (f: File | null) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-[0.22em] font-extrabold mb-1.5 text-red-600 dark:text-yellow-400">
        {label}
      </label>
      <div
        className={`border-2 border-dashed border-red-600 dark:border-yellow-400 rounded-xl p-4 text-center text-sm bg-red-50/40 dark:bg-yellow-400/5`}
      >
        {file ? (
          <p className="text-green-600 dark:text-green-400 font-extrabold mb-3 break-all">{file.name}</p>
        ) : atual ? (
          <p className="text-neutral-900 dark:text-white font-bold mb-3">✓ Arquivo já enviado</p>
        ) : (
          <p className="text-neutral-700 dark:text-white/80 font-semibold mb-3">Nenhum arquivo selecionado</p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label
            className={`flex items-center justify-center gap-2 py-3 rounded-lg bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-red-600/40 ${
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-red-700 active:scale-[0.98]"
            }`}
          >
            <Camera className="h-4 w-4" />
            Tirar foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              disabled={disabled}
              onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
          </label>
          <label
            className={`flex items-center justify-center gap-2 py-3 rounded-lg bg-blue-600 text-white font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-600/40 ${
              disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-blue-700 active:scale-[0.98]"
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            Galeria
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={disabled}
              onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

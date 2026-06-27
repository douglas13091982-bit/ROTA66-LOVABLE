import { Bike, Car, Zap } from "lucide-react";
import { AuthInput } from "@/components/AuthCard";
import { sanitizeDigits } from "@/lib/sanitize";
import { progressiveFormatCpf } from "../logic/format-progressivo";

type TipoVeiculo = "moto" | "carro" | "bike_eletrica";

const VEICULOS = [
  { value: "moto" as const, label: "Moto", Icon: Bike, desc: "Entregas rápidas" },
  { value: "carro" as const, label: "Carro", Icon: Car, desc: "Mais pedidos por rota" },
  { value: "bike_eletrica" as const, label: "Bike elétrica", Icon: Zap, desc: "Coleta até 4 km" },
];

type Props = {
  cpf: string;
  setCpf: (v: string) => void;
  tipoVeiculo: TipoVeiculo;
  setTipoVeiculo: (v: TipoVeiculo) => void;
  avatarFile: File | null;
  avatarPreview: string | null;
  onAvatarChange: (file: File | null) => void;
};

export function EntregadorFields({
  cpf,
  setCpf,
  tipoVeiculo,
  setTipoVeiculo,
  avatarFile,
  avatarPreview,
  onAvatarChange,
}: Props) {
  return (
    <>
      <AuthInput
        label="CPF"
        type="text"
        inputMode="numeric"
        pattern="[0-9.\-]*"
        required
        value={cpf}
        onChange={(e) => setCpf(progressiveFormatCpf(sanitizeDigits(e.target.value, 11)))}
        placeholder="000.000.000-00"
        maxLength={14}
      />
      <div className="mb-4">
        <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Tipo de veículo <span className="text-destructive">*</span>
        </span>
        <div className="grid grid-cols-2 gap-2">
          {VEICULOS.map(({ value, label, Icon, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTipoVeiculo(value)}
              className={`p-3 rounded-md border-2 text-center transition-all ${
                tipoVeiculo === value ? "border-primary bg-primary/10 shadow-red" : "border-border hover:border-primary/50"
              }`}
              title={desc}
            >
              <Icon className={`h-6 w-6 mx-auto mb-1 ${tipoVeiculo === value ? "text-primary" : "text-muted-foreground"}`} />
              <div className="font-display text-sm tracking-wide">{label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>
      <AvatarUpload file={avatarFile} preview={avatarPreview} onChange={onAvatarChange} />
    </>
  );
}

function AvatarUpload({
  file,
  preview,
  onChange,
}: {
  file: File | null;
  preview: string | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="mb-4">
      <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Foto de perfil <span className="text-destructive">*</span>
      </span>
      <div className="flex items-center gap-4">
        <div
          className={`h-20 w-20 rounded-full border-2 bg-background overflow-hidden flex items-center justify-center text-muted-foreground text-xs shrink-0 ${preview ? "border-border" : "border-destructive"}`}
        >
          {preview ? (
            <img src={preview} alt="Pré-visualização" className="h-full w-full object-cover" />
          ) : (
            "Obrigatória"
          )}
        </div>
        <label className="cursor-pointer px-4 py-2 bg-muted hover:bg-muted/70 rounded-md text-sm font-bold uppercase tracking-wider">
          {file ? "Trocar" : "Escolher foto"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Obrigatória para entregadores. Máx 3MB.</p>
    </div>
  );
}

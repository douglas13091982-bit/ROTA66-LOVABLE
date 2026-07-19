import { Bike, Car, Zap, Check } from "lucide-react";
import { AuthInput } from "@/components/AuthCard";
import { sanitizeDigits } from "@/lib/sanitize";
import { useCidades } from "@/hooks/use-cidades";
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
  cityId: string;
  setCityId: (v: string) => void;
  avatarFile: File | null;
  avatarPreview: string | null;
  onAvatarChange: (file: File | null) => void;
};

export function EntregadorFields({
  cpf,
  setCpf,
  tipoVeiculo,
  setTipoVeiculo,
  cityId,
  setCityId,
  avatarFile,
  avatarPreview,
  onAvatarChange,
}: Props) {
  const { cidades, isLoading: loadingCidades } = useCidades();
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
        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
          Cidade onde vai atuar <span className="text-destructive">*</span>
        </span>
        <select
          required
          value={cityId}
          onChange={(e) => setCityId(e.target.value)}
          disabled={loadingCidades}
          className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25 transition-all"
        >
          <option value="">{loadingCidades ? "Carregando..." : "Selecione sua cidade"}</option>
          {cidades.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} — {c.uf}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-muted-foreground mt-2">
          Sua cidade define qual franqueado vai analisar e aprovar seu cadastro.
        </p>
      </div>
      <div className="mb-4">
        <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Tipo de veículo <span className="text-destructive">*</span>
        </span>
        <div className="grid grid-cols-3 gap-2">
          {VEICULOS.map(({ value, label, Icon, desc }) => {
            const selected = tipoVeiculo === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTipoVeiculo(value)}
                aria-pressed={selected}
                className={`relative p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                  selected
                    ? "border-primary bg-primary/15 shadow-[0_0_0_3px_hsl(var(--primary)/0.25)] scale-[1.03] ring-2 ring-primary/40"
                    : "border-border/70 bg-background/40 hover:border-primary/50 hover:bg-primary/5 opacity-80"
                }`}
                title={desc}
              >
                {selected && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
                <Icon
                  className={`h-7 w-7 mx-auto mb-1 transition-colors ${
                    selected ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <div
                  className={`font-display text-sm tracking-wide ${
                    selected ? "text-primary font-bold" : "text-foreground"
                  }`}
                >
                  {label}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
              </button>
            );
          })}
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

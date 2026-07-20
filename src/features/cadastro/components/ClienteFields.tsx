import { AuthInput } from "@/components/AuthCard";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { sanitizeDigits } from "@/lib/sanitize";
import { progressiveFormatCpf } from "../logic/format-progressivo";

type Props = {
  cpf: string;
  setCpf: (v: string) => void;
  endereco: string;
  setEndereco: (v: string) => void;
  cidade: string;
  setCidade: (v: string) => void;
  estado: string;
  setEstado: (v: string) => void;
};

export function ClienteFields({ cpf, setCpf, endereco, setEndereco, cidade, setCidade, estado, setEstado }: Props) {
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
        autoComplete="off"
      />
      <p className="text-[11px] text-muted-foreground -mt-2 mb-3">
        Usaremos automaticamente nos pagamentos por Pix e cartão.
      </p>
      <AddressAutocomplete
        label="Endereço"
        required
        value={endereco}
        onChange={(v) => setEndereco(v.slice(0, 200))}
        onSelect={(s) => {
          setEndereco(s.endereco.slice(0, 200));
          if (s.cidade) setCidade(s.cidade.slice(0, 80));
          if (s.estado) setEstado(s.estado.slice(0, 2));
        }}
        placeholder="Comece a digitar — buscamos no Google Maps"
      />
      <div className="grid grid-cols-[1fr_120px] gap-3">
        <AuthInput
          label="Cidade"
          required
          value={cidade}
          onChange={(e) => setCidade(e.target.value.slice(0, 80))}
          placeholder="Preenchida ao escolher o endereço"
          maxLength={80}
          autoComplete="address-level2"
        />
        <AuthInput
          label="UF"
          required
          value={estado}
          onChange={(e) => setEstado(e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2))}
          placeholder="SP"
          maxLength={2}
          autoComplete="address-level1"
        />
      </div>
    </>
  );
}

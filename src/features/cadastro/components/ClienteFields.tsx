import { AuthInput } from "@/components/AuthCard";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

type Props = {
  endereco: string;
  setEndereco: (v: string) => void;
  cidade: string;
  setCidade: (v: string) => void;
  estado: string;
  setEstado: (v: string) => void;
};

export function ClienteFields({ endereco, setEndereco, cidade, setCidade, estado, setEstado }: Props) {
  return (
    <>
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

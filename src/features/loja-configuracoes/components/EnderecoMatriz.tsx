import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Field } from "./Field";

export function EnderecoMatriz({
  endereco,
  bairro,
  coordsLat,
  onEnderecoChange,
  onSelectPlace,
  onBairroChange,
}: {
  endereco: string;
  bairro: string;
  coordsLat: number | null;
  onEnderecoChange: (v: string) => void;
  onSelectPlace: (p: { address: string; lat: number; lng: number }) => void;
  onBairroChange: (v: string) => void;
}) {
  return (
    <div className="pt-2 border-t border-border space-y-4">
      <div>
        <div className="font-display text-lg tracking-wide flex items-center gap-2">
          🏠 Endereço da Matriz
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Este é o endereço de coleta padrão. Outros locais podem ser adicionados na seção abaixo.
        </p>
      </div>
      <label className="block">
        <span className="block text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Endereço
        </span>
        <AddressAutocomplete
          className="w-full bg-background border border-border rounded-md px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          value={endereco}
          onChange={onEnderecoChange}
          onSelectPlace={onSelectPlace}
          placeholder="Rua, número, bairro, cidade"
        />
        {endereco && coordsLat == null && (
          <span className="block text-[11px] text-amber-600 mt-1">
            Selecione uma sugestão para salvar as coordenadas (necessário para taxa automática).
          </span>
        )}
      </label>

      <Field label="Bairro" value={bairro} onChange={onBairroChange} />
    </div>
  );
}

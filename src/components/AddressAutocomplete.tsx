import { useEffect, useRef, useState } from "react";
import {
  fetchAutocompleteAddressSuggestions,
  fetchPlaceDetails,
  loadGoogleMaps,
  type AddressSelection,
  type AddressSuggestion,
  type PlaceSelection,
} from "@/lib/google-maps-places";

export type { AddressSelection, PlaceSelection } from "@/lib/google-maps-places";

type Props = {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  /** Novo: retorna endereço + cidade + estado + coords */
  onSelect?: (s: AddressSelection) => void;
  /** Legado: retorna { address, lat, lng } */
  onSelectPlace?: (p: PlaceSelection) => void;
  placeholder?: string;
  className?: string;
};

export function AddressAutocomplete({
  label,
  required,
  value,
  onChange,
  onSelect,
  onSelectPlace,
  placeholder = "Comece a digitar o endereço…",
  className,
}: Props) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionTokenRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGoogleMaps().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const fetchSuggestions = (input: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!input.trim() || input.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const result = await fetchAutocompleteAddressSuggestions(input, sessionTokenRef.current);
        sessionTokenRef.current = result.sessionToken;
        setSuggestions(result.suggestions);
        setOpen(true);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao buscar endereço");
      } finally {
        setLoading(false);
      }
    }, 250);
  };

  const handleSelect = async (s: AddressSuggestion) => {
    setOpen(false);
    try {
      sessionTokenRef.current = null;
      const details = await fetchPlaceDetails(s);
      onChange(details.endereco);
      onSelect?.(details);
      onSelectPlace?.(details);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível obter detalhes do endereço");
    }
  };

  const inputClass =
    className ??
    "w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25 transition-all duration-300 ease-premium";

  const inputEl = (
    <input
      type="text"
      required={required}
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v);
        fetchSuggestions(v);
      }}
      onFocus={() => {
        if (suggestions.length > 0) setOpen(true);
      }}
      placeholder={placeholder}
      autoComplete="off"
      maxLength={250}
      className={inputClass}
    />
  );

  return (
    <div ref={wrapRef} className="relative mb-5">
      {label ? (
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
            {label} {required && <span className="text-destructive">*</span>}
          </span>
          {inputEl}
        </label>
      ) : (
        inputEl
      )}
      {error && <div className="mt-1 text-[11px] text-destructive">{error}</div>}
      {loading && <div className="mt-1 text-[11px] text-muted-foreground">Buscando…</div>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-72 overflow-auto">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-muted/60 transition flex flex-col"
              >
                <span className="text-sm text-foreground">{s.primary}</span>
                {s.secondary && (
                  <span className="text-xs text-muted-foreground">{s.secondary}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

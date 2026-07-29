import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    loadGoogleMaps().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const alvo = e.target as Node;
      // A lista é renderizada via portal no body — precisa ser considerada "dentro".
      if (wrapRef.current?.contains(alvo) || listRef.current?.contains(alvo)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);


  const aberto = open && suggestions.length > 0;

  useLayoutEffect(() => {
    if (!aberto) return;
    const atualizar = () => {
      const el = fieldRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    atualizar();
    window.addEventListener("scroll", atualizar, true);
    window.addEventListener("resize", atualizar);
    return () => {
      window.removeEventListener("scroll", atualizar, true);
      window.removeEventListener("resize", atualizar);
    };
  }, [aberto, suggestions.length]);

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
      <div ref={fieldRef}>
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
      </div>
      {error && <div className="mt-1 text-[11px] text-destructive">{error}</div>}
      {loading && <div className="mt-1 text-[11px] text-muted-foreground">Buscando…</div>}
      {aberto &&
        rect &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            ref={listRef}

            style={{
              position: "fixed",
              top: rect.top,
              left: rect.left,
              width: rect.width,
              zIndex: 9999,
            }}
            className="bg-popover border border-border rounded-lg shadow-2xl ring-1 ring-black/10 max-h-72 overflow-auto"
          >
            {suggestions.map((s) => (
              <li key={s.placeId}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
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
          </ul>,
          document.body,
        )}
    </div>
  );
}

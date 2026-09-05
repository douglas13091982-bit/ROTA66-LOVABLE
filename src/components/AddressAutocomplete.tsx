import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useServerFn } from "@tanstack/react-start";
import { fetchAddressSuggestions, fetchAddressDetails, type MapboxSuggestion } from "@/lib/address-autocomplete.functions";

export type AddressSelection = {
  endereco: string;
  cidade: string;
  estado: string;
  lat: number | null;
  lng: number | null;
};

export type PlaceSelection = {
  address: string;
  lat: number | null;
  lng: number | null;
};



type Props = {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  onSelect?: (s: AddressSelection) => void;
  onSelectPlace?: (p: { address: string; lat: number | null; lng: number | null }) => void;
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
  const [suggestions, setSuggestions] = useState<MapboxSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const runFetchSuggestions = useServerFn(fetchAddressSuggestions);
  const runFetchDetails = useServerFn(fetchAddressDetails);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const alvo = e.target as Node;
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
        const { suggestions: result } = await runFetchSuggestions({ data: { input } });
        setSuggestions(result);
        setOpen(true);
      } catch (e: any) {
        setError(e?.message ?? "Erro ao buscar endereço");
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = async (s: MapboxSuggestion) => {
    setOpen(false);
    // A sugestao ja traz o endereco completo (com numero) e as coordenadas.
    if (s.endereco && s.lat != null && s.lng != null) {
      onChange(s.endereco);
      if (onSelect) {
        onSelect({ endereco: s.endereco, cidade: "", estado: "", lat: s.lat, lng: s.lng });
      } else if (onSelectPlace) {
        onSelectPlace({ address: s.endereco, lat: s.lat, lng: s.lng });
      }
      return;
    }
    try {
      setLoading(true);
      const details = await runFetchDetails({ data: { placeId: s.placeId } });
      onChange(details.endereco);
      if (onSelect) {
        onSelect(details as any);
      } else if (onSelectPlace) {
        onSelectPlace({ address: details.endereco, lat: details.lat, lng: details.lng });
      }
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível obter detalhes do endereço");
    } finally {
      setLoading(false);
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
        if (v.trim()) {
          setOpen(true);
          fetchSuggestions(v);
        } else {
          setOpen(false);
          setSuggestions([]);
        }
      }}
      onFocus={() => {
        if (value.trim()) {
          setOpen(true);
          fetchSuggestions(value);
        }
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

import { AuthInput } from "@/components/AuthCard";
import { sanitizeDigits, sanitizeName } from "@/lib/sanitize";
import { useLojaCategorias } from "@/hooks/use-loja-categorias";
import { useCidades } from "@/hooks/use-cidades";
import type { LojaCategoria } from "@/lib/loja-categorias";
import { progressiveFormatCnpj } from "../logic/format-progressivo";

type Props = {
  nomeLoja: string;
  setNomeLoja: (v: string) => void;
  cnpj: string;
  setCnpj: (v: string) => void;
  categoria: LojaCategoria | "";
  setCategoria: (v: LojaCategoria | "") => void;
  cityId: string;
  setCityId: (v: string) => void;
  aceiteContrato: boolean;
  setAceiteContrato: (v: boolean) => void;
  contratoVersao?: number | null;
  onOpenContrato: () => void;
};

export function LojaFields({
  nomeLoja,
  setNomeLoja,
  cnpj,
  setCnpj,
  categoria,
  setCategoria,
  aceiteContrato,
  setAceiteContrato,
  contratoVersao,
  onOpenContrato,
}: Props) {
  const { categorias } = useLojaCategorias();
  return (
    <>
      <AuthInput
        label="Nome da loja"
        required
        value={nomeLoja}
        onChange={(e) => setNomeLoja(sanitizeName(e.target.value, 120))}
        placeholder="Ex.: Pizzaria do Zé"
        maxLength={120}
        autoComplete="organization"
      />
      <AuthInput
        label="CNPJ"
        type="text"
        inputMode="numeric"
        pattern="[0-9./\-]*"
        required
        value={cnpj}
        onChange={(e) => setCnpj(progressiveFormatCnpj(sanitizeDigits(e.target.value, 14)))}
        placeholder="00.000.000/0000-00"
        maxLength={18}
      />
      <label className="block mb-5">
        <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground mb-2.5">
          Categoria de atuação
        </span>
        <select
          required
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as LojaCategoria)}
          className="w-full bg-background/60 border border-border/60 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/70 focus:ring-2 focus:ring-primary/25 transition-all duration-300 ease-premium"
        >
          <option value="">Selecione...</option>
          {categorias.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-3 mb-5 cursor-pointer select-none rounded-lg border border-border/60 bg-background/40 p-3">
        <input
          type="checkbox"
          checked={aceiteContrato}
          onChange={(e) => setAceiteContrato(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span className="text-[12.5px] text-foreground/85 leading-snug">
          Li e aceito os{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onOpenContrato();
            }}
            className="text-primary underline underline-offset-2 font-semibold"
          >
            Termos de Uso
          </button>
          {contratoVersao ? <span className="text-muted-foreground"> (v{contratoVersao})</span> : null}.
        </span>
      </label>
    </>
  );
}

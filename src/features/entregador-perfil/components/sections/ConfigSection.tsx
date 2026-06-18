import { Moon, Sun } from "lucide-react";
import { SectionPanel } from "../ui-atoms";
import { useEntregadorTheme } from "@/hooks/use-entregador-theme";

type LojaVinc = {
  loja_id: string;
  ativo: boolean;
  loja?: { id: string; nome: string | null } | undefined;
};

type Props = {
  aceitaExternos: boolean;
  savingExternos: boolean;
  onToggleExternos: (novo: boolean) => void;
  lojas: LojaVinc[] | undefined;
};

export function ConfigSection({
  aceitaExternos,
  savingExternos,
  onToggleExternos,
  lojas,
}: Props) {
  const { theme, setTheme } = useEntregadorTheme();
  return (
    <SectionPanel>
      {/* Tema do app */}
      <div className="flex items-start justify-between gap-3 py-1 pb-3 border-b border-white/8">
        <div className="flex-1">
          <p className="text-[13.5px] font-semibold text-white">Tema do app</p>
          <p className="text-[11.5px] text-white/55 mt-0.5 leading-snug">
            Escolha entre o tema escuro (padrão) e o tema claro.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/15 bg-white/[0.04] p-1">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
              theme === "dark"
                ? "bg-white/15 text-white"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Moon className="h-3.5 w-3.5" />
            Escuro
          </button>
          <button
            type="button"
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all ${
              theme === "light"
                ? "bg-white text-[#bd0f10]"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            <Sun className="h-3.5 w-3.5" />
            Claro
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 py-1 pt-3">
        <div className="flex-1">
          <p className="text-[13.5px] font-semibold text-white">Entregador externo</p>
          <p className="text-[11.5px] text-white/55 mt-0.5 leading-snug">
            Receba pedidos de lojas sem entregador próprio online.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleExternos(!aceitaExternos)}
          disabled={savingExternos}
          aria-pressed={aceitaExternos}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            aceitaExternos ? "bg-emerald-500" : "bg-white/15"
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              aceitaExternos ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <div className="pt-3 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-bold mb-2">
          Lojas vinculadas
        </p>
        {!lojas || lojas.length === 0 ? (
          <p className="text-[12px] text-white/50">Nenhum vínculo ainda.</p>
        ) : (
          <ul className="space-y-1.5">
            {lojas.map((v) => (
              <li
                key={v.loja_id}
                className="flex items-center justify-between text-[13px]"
              >
                <span className="text-white/85 font-medium truncate">
                  {v.loja?.nome ?? "—"}
                </span>
                <span
                  className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] rounded-full ${
                    v.ativo
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-white/8 text-white/50"
                  }`}
                >
                  {v.ativo ? "Ativo" : "Inativo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionPanel>
  );
}

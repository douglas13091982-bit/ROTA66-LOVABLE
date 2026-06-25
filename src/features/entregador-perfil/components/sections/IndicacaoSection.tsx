import { useState } from "react";
import { toast } from "sonner";
import { Copy, Share2, Store, Check } from "lucide-react";

type Props = {
  codigo: string | null;
};

export function IndicacaoSection({ codigo }: Props) {
  const [copied, setCopied] = useState<"codigo" | "link" | null>(null);

  if (!codigo) {
    return (
      <div className="rounded-xl bg-white/5 p-4 text-sm text-white/70">
        Carregando seu código de indicação…
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/cadastro?role=loja_admin&ref=${codigo}`;

  async function copiar(valor: string, tipo: "codigo" | "link") {
    try {
      await navigator.clipboard.writeText(valor);
      setCopied(tipo);
      toast.success("Copiado!");
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  async function compartilhar() {
    const texto = `Cadastre sua loja na ROTA 66 e use meu código de indicação: ${codigo}\n${link}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Cadastre sua loja na ROTA 66", text: texto, url: link });
      } catch {
        /* user cancelled */
      }
    } else {
      await copiar(texto, "link");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Store className="h-4 w-4 text-amber-400" />
          <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Indique uma loja
          </div>
        </div>
        <p className="text-[13px] text-white/75 leading-snug">
          Compartilhe seu código com lojas. Quando uma loja se cadastrar usando
          ele, o super admin verá que <strong>você</strong> indicou.
        </p>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
          Seu código
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-3 font-mono text-lg font-bold tracking-[0.3em] text-center text-white">
            {codigo}
          </div>
          <button
            type="button"
            onClick={() => copiar(codigo, "codigo")}
            className="h-12 w-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 active:scale-95"
            aria-label="Copiar código"
          >
            {copied === "codigo" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-1.5">
          Link de indicação
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-white/80 truncate">
            {link}
          </div>
          <button
            type="button"
            onClick={() => copiar(link, "link")}
            className="h-10 w-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/80 active:scale-95"
            aria-label="Copiar link"
          >
            {copied === "link" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={compartilhar}
        className="w-full h-12 rounded-xl bg-gradient-red shadow-red text-primary-foreground font-bold flex items-center justify-center gap-2 active:scale-[0.98]"
      >
        <Share2 className="h-4 w-4" />
        Compartilhar
      </button>
    </div>
  );
}

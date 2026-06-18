import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Search, UserRound } from "lucide-react";
import { PerfilDialog } from "./PerfilDialog";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  cidade: string;
  uf?: string;
  logoUrl: string;
  nomeSistema: string;
  busca: string;
  onBuscaChange: (v: string) => void;
}

export function CidadeHero({ cidade, uf, logoUrl, nomeSistema, busca, onBuscaChange }: Props) {
  const [nomeCliente, setNomeCliente] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const meta = (auth.user.user_metadata ?? {}) as Record<string, any>;
      let full = "";
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", auth.user.id)
        .maybeSingle();
      full = ((data as any)?.full_name ?? "").trim();
      if (!full) full = String(meta.full_name ?? meta.name ?? "").trim();
      if (!full && auth.user.email) full = auth.user.email.split("@")[0];
      if (cancelled) return;
      const primeiro = full.split(/\s+/)[0] ?? "";
      setNomeCliente(primeiro);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 pt-2 pb-3 relative">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Link
            to="/clientes"
            className="mp-back inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] font-semibold transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Trocar cidade
          </Link>
          <PerfilDialog>
            <button
              type="button"
              className="mp-pill inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-3 py-1.5 max-w-[180px]"
            >
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{nomeCliente || "Meu cadastro"}</span>
            </button>
          </PerfilDialog>
        </div>
        <div className="flex justify-center -mt-8 mb-0">
          <img src={logoUrl} alt={nomeSistema} className="h-16 w-auto object-contain drop-shadow-[0_8px_24px_rgba(187,16,16,0.5)]" />
        </div>

        <div className="relative mt-3.5">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 mp-muted" />
          <input
            value={busca}
            onChange={(e) => onBuscaChange(e.target.value)}
            placeholder="Buscar loja…"
            className="mp-input w-full pl-10 pr-3 py-3 rounded-2xl text-[14px] transition"
          />
        </div>
      </div>
    </div>
  );
}

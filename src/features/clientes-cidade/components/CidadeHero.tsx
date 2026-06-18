import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserRound, UserPlus, MapPin, ChevronDown, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PerfilDialog } from "./PerfilDialog";
import { supabase } from "@/integrations/supabase/client";
import { useCidadesDisponiveis } from "../hooks/use-cidades-disponiveis";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [logado, setLogado] = useState<boolean>(false);
  const navigate = useNavigate();
  const { data: cidades = [] } = useCidadesDisponiveis();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (!cancelled) setLogado(false);
        return;
      }
      if (!cancelled) setLogado(true);
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

  const selectedKey = `${cidade.trim().toLowerCase()}|${(uf ?? "").trim().toLowerCase()}`;

  const handleCidadeChange = (value: string) => {
    const [novaCidade, novoUf] = value.split("|");
    navigate({
      to: "/clientes/$cidade",
      params: { cidade: encodeURIComponent(novaCidade) },
      search: novoUf ? { uf: novoUf.toUpperCase() } : {},
    });
  };

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-3 relative">
        <div className="flex items-center justify-end gap-2 mb-2">
          {!logado && (
            <button
              type="button"
              onClick={() => navigate({ to: "/cadastro" })}
              className="mp-pill inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-3 py-1.5"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span>Cadastrar</span>
            </button>
          )}
          <PerfilDialog>
            <button
              type="button"
              className="mp-pill inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-3 py-1.5 max-w-[180px]"
            >
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{nomeCliente || "Meu cadastro"}</span>
            </button>
          </PerfilDialog>
          {logado && (
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Você saiu da conta");
                setLogado(false);
                setNomeCliente("");
                navigate({ to: "/login" });
              }}
              className="mp-pill inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-3 py-1.5"
              aria-label="Sair da conta"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Sair</span>
            </button>
          )}
        </div>
        <div className="flex justify-center -mt-3 mb-1">
          <img src={logoUrl} alt={nomeSistema} className="h-16 w-auto object-contain drop-shadow-[0_8px_24px_rgba(187,16,16,0.5)]" />
        </div>

        <div className="mt-3">
          <Select value={cidades.some((c) => `${c.cidade.toLowerCase()}|${(c.estado ?? "").toLowerCase()}` === selectedKey) ? selectedKey : undefined} onValueChange={handleCidadeChange}>
            <SelectTrigger className="mp-input w-full rounded-2xl py-3 text-[14px]">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 mp-muted shrink-0" />
                <SelectValue placeholder={`${cidade}${uf ? ` - ${uf}` : ""}`}>
                  <span className="truncate">{cidade}{uf ? ` - ${uf}` : ""}</span>
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {cidades.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma cidade disponível</div>
              )}
              {cidades.map((c) => {
                const key = `${c.cidade.toLowerCase()}|${(c.estado ?? "").toLowerCase()}`;
                return (
                  <SelectItem key={key} value={`${c.cidade}|${c.estado ?? ""}`}>
                    {c.cidade}{c.estado ? ` - ${c.estado}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="relative mt-3">
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

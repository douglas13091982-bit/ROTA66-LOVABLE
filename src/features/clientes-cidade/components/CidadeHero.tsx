import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, UserRound, UserPlus, MapPin, LogOut, Menu, LogIn } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
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

  const handleSair = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da conta");
    setLogado(false);
    setNomeCliente("");
    setMenuOpen(false);
    navigate({ to: "/login" });
  };

  return (
    <div>
      <div className="max-w-2xl mx-auto px-4 pt-5 pb-3 relative">
        <div className="flex items-center justify-between gap-2 mb-2">
          <Select value={cidades.some((c) => `${c.cidade.toLowerCase()}|${(c.estado ?? "").toLowerCase()}` === selectedKey) ? selectedKey : undefined} onValueChange={handleCidadeChange}>
            <SelectTrigger className="w-auto h-auto gap-1.5 px-1 py-1 rounded-full bg-transparent border-0 text-[15px] font-bold text-[#0d2c54] transition shadow-none focus:ring-0 focus:ring-offset-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin className="h-3.5 w-3.5 opacity-70 shrink-0" />
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

          {!logado && (
            <button
              type="button"
              onClick={() => navigate({ to: "/cadastro", search: { role: "cliente" } })}
              className="mp-pill inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-full px-3 py-1.5"
            >
              <UserPlus className="h-3.5 w-3.5 shrink-0" />
              <span>Cadastrar</span>
            </button>
          )}
        </div>

        <div className="flex justify-center mt-2 mb-1">
          <img src={logoUrl} alt={nomeSistema} className="h-28 w-auto object-contain" />
        </div>
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.28em] mt-1 animate-fade-in text-[#0d2c54]">
          Peça seu delivery
        </p>


      </div>
      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
    </div>
  );
}

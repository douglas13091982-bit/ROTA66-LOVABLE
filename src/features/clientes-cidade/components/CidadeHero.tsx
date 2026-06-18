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
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Abrir menu"
                className="mp-pill inline-flex items-center justify-center rounded-full h-10 w-10"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
              <SheetHeader className="px-5 pt-6 pb-4 border-b">
                <SheetTitle className="flex items-center gap-3 text-left">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserRound className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold truncate">
                      {logado ? nomeCliente || "Minha conta" : "Visitante"}
                    </span>
                    <span className="text-[11px] font-normal text-muted-foreground">
                      {logado ? "Você está conectado" : "Entre ou cadastre-se"}
                    </span>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col py-2">
                {logado ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setTimeout(() => setPerfilOpen(true), 150);
                      }}
                      className="flex items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-muted text-left w-full"
                    >
                      <UserRound className="h-4 w-4 text-muted-foreground" />
                      Meu perfil
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate({ to: "/cadastro", search: { role: "cliente" } });
                      }}
                      className="flex items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-muted text-left"
                    >
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      Cadastrar
                    </button>
                    <button
                      type="button"
                      onClick={handleSair}
                      className="flex items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-muted text-left text-destructive"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair da conta
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate({ to: "/login" });
                      }}
                      className="flex items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-muted text-left"
                    >
                      <LogIn className="h-4 w-4 text-muted-foreground" />
                      Entrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate({ to: "/cadastro", search: { role: "cliente" } });
                      }}
                      className="flex items-center gap-3 px-5 py-3 text-sm font-medium hover:bg-muted text-left"
                    >
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                      Criar conta
                    </button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>

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

        <div className="flex justify-center -mt-8 mb-1">
          <img src={logoUrl} alt={nomeSistema} className="h-24 w-auto object-contain drop-shadow-[0_8px_24px_rgba(187,16,16,0.5)]" />
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
      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
    </div>
  );
}

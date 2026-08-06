import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
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

export function CidadeHero({ cidade, uf, logoUrl, nomeSistema }: Props) {
  const [logado, setLogado] = useState<boolean>(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const navigate = useNavigate();
  const { data: cidades = [] } = useCidadesDisponiveis();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!cancelled) setLogado(!!auth.user);
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
      {/* Barra superior navy */}
      <div className="mp-topbar">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Select
            value={
              cidades.some(
                (c) => `${c.cidade.toLowerCase()}|${(c.estado ?? "").toLowerCase()}` === selectedKey,
              )
                ? selectedKey
                : undefined
            }
            onValueChange={handleCidadeChange}
          >
            <SelectTrigger className="w-auto h-auto gap-1.5 px-0 py-0 bg-transparent border-0 shadow-none focus:ring-0 focus:ring-offset-0 text-[#f5efe3]">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 shrink-0 text-[#c8a253]" strokeWidth={1.6} />
                <SelectValue placeholder={`${cidade}${uf ? ` - ${uf}` : ""}`}>
                  <span className="mp-serif truncate text-[17px]">
                    {cidade}
                    {uf ? ` - ${uf}` : ""}
                  </span>
                </SelectValue>
              </div>
            </SelectTrigger>
            <SelectContent>
              {cidades.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  Nenhuma cidade disponível
                </div>
              )}
              {cidades.map((c) => {
                const key = `${c.cidade.toLowerCase()}|${(c.estado ?? "").toLowerCase()}`;
                return (
                  <SelectItem key={key} value={`${c.cidade}|${c.estado ?? ""}`}>
                    {c.cidade}
                    {c.estado ? ` - ${c.estado}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {!logado && (
            <button
              type="button"
              onClick={() => navigate({ to: "/cadastro", search: { role: "cliente" } })}
              className="mp-pill mp-serif rounded-none px-5 py-2 text-[12px] uppercase tracking-[0.22em]"
            >
              Cadastrar
            </button>
          )}
        </div>
      </div>

      {/* Logo + tagline */}
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-1">
        <div className="flex justify-center">
          <img src={logoUrl} alt={nomeSistema} className="h-20 w-auto object-contain" />
        </div>
        <p className="mp-serif text-center text-[12px] uppercase tracking-[0.36em] mt-2">
          Peça seu delivery
        </p>
        <div className="mp-divider-star mt-2 px-6">
          <Star className="h-3.5 w-3.5 fill-current shrink-0" />
        </div>
      </div>

      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
    </div>
  );
}

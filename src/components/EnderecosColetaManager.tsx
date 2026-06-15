import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, Star, Trash2, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

export type EnderecoColeta = {
  id: string;
  loja_id: string;
  rotulo: string;
  endereco: string;
  lat: number | null;
  lng: number | null;
  padrao: boolean;
};

export function useEnderecosColeta(lojaId: string | undefined) {
  return useQuery({
    queryKey: ["enderecos-coleta", lojaId],
    enabled: !!lojaId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("lojas_enderecos_coleta")
        .select("*")
        .eq("loja_id", lojaId!)
        .order("padrao", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EnderecoColeta[];
    },
  });
}

export function EnderecosColetaManager({ lojaId }: { lojaId: string }) {
  const qc = useQueryClient();
  const { data: enderecos, isLoading } = useEnderecosColeta(lojaId);
  const [adicionar, setAdicionar] = useState(false);
  const [rotulo, setRotulo] = useState("");
  const [endereco, setEndereco] = useState("");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [padrao, setPadrao] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setRotulo(""); setEndereco(""); setCoords({ lat: null, lng: null }); setPadrao(false); setAdicionar(false);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["enderecos-coleta", lojaId] });

  const salvar = async () => {
    const r = rotulo.trim().slice(0, 80);
    const e = endereco.trim().slice(0, 300);
    if (!r || !e) {
      toast.error("Informe um rótulo e um endereço");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("lojas_enderecos_coleta").insert({
      loja_id: lojaId,
      rotulo: r,
      endereco: e,
      lat: coords.lat,
      lng: coords.lng,
      padrao,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Endereço de coleta salvo");
    reset();
    invalidate();
  };

  const marcarPadrao = async (id: string) => {
    const { error } = await (supabase as any)
      .from("lojas_enderecos_coleta")
      .update({ padrao: true })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Endereço marcado como padrão");
    invalidate();
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este endereço de coleta?")) return;
    const { error } = await (supabase as any).from("lojas_enderecos_coleta").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Endereço removido");
    invalidate();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-lg tracking-wide flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" /> Outros endereços de coleta
          </div>
          <p className="text-xs text-muted-foreground">
            Filiais ou pontos extras de retirada além da matriz. Em novos pedidos você poderá escolher entre todos.
          </p>
        </div>
        {!adicionar && (
          <button
            type="button"
            onClick={() => setAdicionar(true)}
            className="text-xs font-bold uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Adicionar
          </button>
        )}
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

      <ul className="space-y-2">
        {(enderecos ?? []).map((e) => (
          <li
            key={e.id}
            className="flex items-start gap-3 p-3 bg-background border border-border rounded-md"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{e.rotulo}</span>
                {e.padrao && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                    Padrão
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 break-words">{e.endereco}</div>
              {e.lat == null && (
                <div className="text-[11px] text-amber-600 mt-1">
                  Sem coordenadas — a taxa automática pode falhar
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {!e.padrao && (
                <button
                  type="button"
                  onClick={() => marcarPadrao(e.id)}
                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-primary"
                  title="Marcar como padrão"
                >
                  <Star className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => remover(e.id)}
                className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
        {!isLoading && (enderecos ?? []).length === 0 && !adicionar && (
          <li className="text-sm text-muted-foreground p-3 bg-background border border-dashed border-border rounded-md">
            Nenhum endereço de coleta salvo ainda.
          </li>
        )}
      </ul>

      {adicionar && (
        <div className="p-4 bg-background border border-border rounded-md space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Rótulo (ex: Matriz, Filial Centro)
            </label>
            <input
              value={rotulo}
              onChange={(e) => setRotulo(e.target.value)}
              maxLength={80}
              className="w-full px-3 py-2.5 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Endereço
            </label>
            <AddressAutocomplete
              className="w-full px-3 py-2.5 bg-card border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={endereco}
              onChange={(v) => { setEndereco(v); setCoords({ lat: null, lng: null }); }}
              onSelectPlace={(p) => { setEndereco(p.address); setCoords({ lat: p.lat, lng: p.lng }); }}
              placeholder="Rua, número, bairro, cidade"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={padrao}
              onChange={(e) => setPadrao(e.target.checked)}
              className="accent-primary"
            />
            Definir como endereço de coleta padrão
          </label>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={reset}
              className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md border border-border hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={salvar}
              disabled={saving}
              className="px-4 py-2 text-sm font-bold uppercase tracking-wider rounded-md bg-gradient-red shadow-red text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar endereço
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

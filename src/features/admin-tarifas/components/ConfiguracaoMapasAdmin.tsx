import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Map, Settings2, Globe, Key, Save, ShieldCheck } from "lucide-react";
import { testarConexaoMapbox } from "@/lib/mapbox.functions";
import { useServerFn } from "@tanstack/react-start";

export function ConfiguracaoMapasAdmin() {
  const qc = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState(false);
  const runTestarConexao = useServerFn(testarConexaoMapbox);

  const { data: config, isLoading } = useQuery({
    queryKey: ["config_frete_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_frete")
        .select("*")
        .eq("id", "singleton" as any)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [formData, setFormData] = useState({
    provedor_mapa: "",
    mapbox_access_token: "",
  });

  // Sincroniza estado local quando os dados carregam
  useState(() => {
    if (config) {
      setFormData({
        provedor_mapa: config.provedor_mapa || "google",
        mapbox_access_token: config.mapbox_access_token || "",
      });
    }
  });

  const atualProvedor = formData.provedor_mapa || config?.provedor_mapa || "google";
  const atualToken = formData.mapbox_access_token !== undefined ? formData.mapbox_access_token : config?.mapbox_access_token || "";

  async function salvar() {
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("config_frete")
        .update({
          provedor_mapa: atualProvedor,
          mapbox_access_token: atualToken,
        })
        .eq("id", "singleton" as any);
      
      if (error) throw error;
      toast.success("Configurações de mapas atualizadas!");
      qc.invalidateQueries({ queryKey: ["config_frete_admin"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function testarMapbox() {
    if (!atualToken) {
      toast.error("Insira um token para testar");
      return;
    }
    setTestando(true);
    try {
      const res = await runTestarConexao({ data: { accessToken: atualToken } });
      if (res.success) {
        toast.success("Conexão com Mapbox validada com sucesso!");
      } else {
        toast.error(`Falha no teste: ${res.error}`);
      }
    } catch (err: any) {
      toast.error("Erro técnico ao testar conexão");
    } finally {
      setTestando(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="border border-[#e4e8ef] bg-white p-5 mb-6 rounded-none shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Map className="h-5 w-5 text-[#0d2c54]" />
        <h2 className="text-lg font-bold text-[#0d2c54] uppercase tracking-tight">
          Configurações Globais de Mapas
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6b7688] mb-1.5 flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> Provedor de Mapas e Rotas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, provedor_mapa: "google" })}
                className={`flex items-center justify-center gap-2 px-4 py-3 border font-bold text-xs uppercase tracking-widest transition-all ${
                  atualProvedor === "google"
                    ? "bg-[#0d2c54] text-white border-[#0d2c54]"
                    : "bg-white text-[#0d2c54] border-[#e4e8ef] hover:bg-gray-50"
                }`}
              >
                Google Maps
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, provedor_mapa: "mapbox" })}
                className={`flex items-center justify-center gap-2 px-4 py-3 border font-bold text-xs uppercase tracking-widest transition-all ${
                  atualProvedor === "mapbox"
                    ? "bg-[#0d2c54] text-white border-[#0d2c54]"
                    : "bg-white text-[#0d2c54] border-[#e4e8ef] hover:bg-gray-50"
                }`}
              >
                Mapbox
              </button>
            </div>
            <p className="text-[10px] text-[#6b7688] mt-2 italic">
              * O sistema utiliza o provedor selecionado para cálculo de frete, geocodificação e exibição dos mapas.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#6b7688] mb-1.5 flex items-center gap-1.5">
              <Key className="h-3 w-3" /> Mapbox Access Token
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={atualToken}
                onChange={(e) => setFormData({ ...formData, mapbox_access_token: e.target.value })}
                placeholder="pk.ey..."
                className="flex-1 h-11 border border-[#e4e8ef] bg-white px-3 text-[#0d2c54] text-sm focus:outline-none focus:border-[#0d2c54] transition-colors"
              />
              <button
                type="button"
                onClick={testarMapbox}
                disabled={testando || !atualToken}
                className="h-11 px-4 border border-[#0d2c54] text-[#0d2c54] font-bold text-[10px] uppercase tracking-widest hover:bg-[#0d2c54] hover:text-white transition-all disabled:opacity-30 flex items-center gap-2"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                {testando ? "..." : "Testar"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#e4e8ef] flex justify-end">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando}
          className="h-12 px-8 bg-[#e3000f] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {salvando ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}

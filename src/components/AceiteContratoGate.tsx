import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMinhaLoja } from "@/hooks/use-loja";
import { ContratoBody, useContratoAtivo } from "@/components/ContratoView";
import { toast } from "sonner";
import { FileText, ScrollText } from "lucide-react";

/**
 * Modal de aceite forçado: se houver contrato ativo não aceito pela loja,
 * bloqueia a interface até a loja aceitar.
 */
export function AceiteContratoGate() {
  const { user } = useAuth();
  const { data: loja } = useMinhaLoja();
  const { contrato, loading } = useContratoAtivo();
  const [jaAceitou, setJaAceitou] = useState<boolean | null>(null);
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!loja?.id || !contrato?.id) {
      setJaAceitou(null);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from("loja_aceites_contrato")
        .select("id")
        .eq("loja_id", loja.id)
        .eq("contrato_id", contrato.id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        setJaAceitou(true); // fail-open para não travar a loja em caso de erro de leitura
        return;
      }
      setJaAceitou(!!data);
    })();
    return () => {
      alive = false;
    };
  }, [loja?.id, contrato?.id]);

  const precisa =
    !loading && !!contrato && !!loja?.id && jaAceitou === false;

  if (!precisa) return null;

  const handleAceitar = async () => {
    if (!loja?.id || !contrato?.id || !checked || saving) return;
    setSaving(true);
    const { error } = await supabase.from("loja_aceites_contrato").insert({
      loja_id: loja.id,
      contrato_id: contrato.id,
      versao: contrato.versao,
      user_agent: navigator.userAgent.slice(0, 500),
      full_name_snapshot: user?.email ?? null,
    });
    setSaving(false);
    if (error) {
      toast.error("Não foi possível registrar o aceite", { description: error.message });
      return;
    }
    toast.success("Termos aceitos com sucesso");
    setJaAceitou(true);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="w-full max-w-2xl bg-[#0d0d0f] border border-white/10 rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="px-5 md:px-6 pt-5 pb-3 border-b border-white/10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl grid place-items-center bg-yellow-400/15 text-yellow-300">
            <ScrollText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-white truncate">
              {contrato!.titulo}
            </div>
            <div className="text-[11px] text-white/50">
              Nova versão (v{contrato!.versao}) — aceite necessário para continuar
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 md:px-6 py-4">
          <ContratoBody conteudo={contrato!.conteudo} />
        </div>

        <div className="px-5 md:px-6 pt-3 pb-5 border-t border-white/10 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-1 h-4 w-4 accent-yellow-400"
            />
            <span className="text-[13px] text-white/85 leading-snug">
              Li e aceito integralmente os <strong className="text-white">Termos de Uso</strong>{" "}
              em nome da minha loja.
            </span>
          </label>
          <button
            type="button"
            disabled={!checked || saving}
            onClick={handleAceitar}
            className="w-full h-12 rounded-xl bg-gradient-to-b from-yellow-400 to-yellow-500 text-black font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <FileText className="h-4 w-4" />
            {saving ? "Registrando..." : "Aceitar e continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}

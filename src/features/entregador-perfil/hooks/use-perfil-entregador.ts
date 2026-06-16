import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { TipoVeiculo } from "../logic/types";

export function usePerfilEntregador(userId: string | undefined) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pixChave, setPixChave] = useState("");
  const [aceitaExternos, setAceitaExternos] = useState(false);
  const [tipoVeiculo, setTipoVeiculo] = useState<TipoVeiculo>("moto");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingExternos, setSavingExternos] = useState(false);
  const [savingVeiculo, setSavingVeiculo] = useState(false);

  const { data: profile, refetch: refetchProfile } = useQuery({
    queryKey: ["meu-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, pix_chave, aceita_pedidos_externos, avatar_url, tipo_veiculo",
        )
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setPixChave((profile as any).pix_chave ?? "");
      setAceitaExternos(!!(profile as any).aceita_pedidos_externos);
      setAvatarUrl((profile as any).avatar_url ?? null);
      setTipoVeiculo(((profile as any).tipo_veiculo as TipoVeiculo) ?? "moto");
    }
  }, [profile]);

  const salvar = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, full_name: fullName, phone, pix_chave: pixChave || null },
        { onConflict: "id" },
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado!");
  };

  const toggleExternos = async (novo: boolean) => {
    if (!userId) return;
    setSavingExternos(true);
    setAceitaExternos(novo);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, aceita_pedidos_externos: novo } as any,
        { onConflict: "id" },
      );
    setSavingExternos(false);
    if (error) {
      toast.error(error.message);
      setAceitaExternos(!novo);
    } else {
      toast.success(novo ? "Você passa a receber pedidos abertos" : "Você saiu do pool externo");
      refetchProfile();
    }
  };

  const salvarVeiculo = async (novo: TipoVeiculo) => {
    if (!userId || novo === tipoVeiculo) return;
    const anterior = tipoVeiculo;
    setTipoVeiculo(novo);
    setSavingVeiculo(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: userId, tipo_veiculo: novo } as any,
        { onConflict: "id" },
      );
    setSavingVeiculo(false);
    if (error) {
      setTipoVeiculo(anterior);
      toast.error(error.message);
    } else {
      toast.success(novo === "carro" ? "Veículo: Carro" : "Veículo: Moto");
      refetchProfile();
    }
  };

  return {
    fullName,
    setFullName,
    phone,
    setPhone,
    pixChave,
    setPixChave,
    aceitaExternos,
    tipoVeiculo,
    avatarUrl,
    setAvatarUrl,
    saving,
    savingExternos,
    savingVeiculo,
    salvar,
    toggleExternos,
    salvarVeiculo,
    refetchProfile,
  };
}

import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useNovoTurno(lojaId: string, onCreated: () => void) {
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("4");
  const [valorHora, setValorHora] = useState("");
  const [taxaEntrega, setTaxaEntrega] = useState("");
  const [vagas, setVagas] = useState("1");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  const minDate = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !hora) {
      toast.error("Defina data e hora do turno");
      return;
    }
    const inicio = new Date(`${data}T${hora}`);
    if (inicio.getTime() < Date.now()) {
      toast.error("O turno deve começar no futuro");
      return;
    }
    const vh = Number(valorHora);
    if (!vh || vh <= 0) {
      toast.error("Defina um valor por hora");
      return;
    }
    const vg = Math.max(1, Math.min(50, Math.floor(Number(vagas) || 1)));
    setBusy(true);
    const { error } = await supabase.from("agendamentos" as never).insert({
      loja_id: lojaId,
      data_turno: data,
      hora_inicio: hora,
      duracao_horas: Number(duracao) || 1,
      valor_por_hora: vh,
      taxa_por_entrega: Number(taxaEntrega) || 0,
      vagas_total: vg,
      observacoes: obs.trim() || null,
      status: "rascunho",
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno criado! Clique em 'Publicar' para enviar aos entregadores.");
    onCreated();
  }

  return {
    fields: { data, hora, duracao, valorHora, taxaEntrega, vagas, obs },
    setters: {
      setData,
      setHora,
      setDuracao,
      setValorHora,
      setTaxaEntrega,
      setVagas,
      setObs,
    },
    busy,
    minDate,
    submit,
  };
}

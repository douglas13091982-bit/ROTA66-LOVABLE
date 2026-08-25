import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Despesa, DespesaForm, Socio } from "../logic/types";

type Params = {
  franqueadoUserId: string | null;
  competencia: string;
  userId: string | undefined;
  isColaborador: boolean;
};

export function useAdminDespesas({ franqueadoUserId, competencia, userId, isColaborador }: Params) {
  const qc = useQueryClient();
  const sociosKey = ["franqueado-socios", franqueadoUserId];
  const despesasKey = ["franqueado-despesas", franqueadoUserId, competencia];

  const { data: socios, isLoading: loadingSocios } = useQuery({
    queryKey: sociosKey,
    enabled: !!franqueadoUserId,
    queryFn: async (): Promise<Socio[]> => {
      const { data, error } = await (supabase as any)
        .from("franqueado_socios")
        .select("*")
        .eq("franqueado_user_id", franqueadoUserId)
        .order("ordem");
      if (error) throw error;
      return (data ?? []) as Socio[];
    },
  });

  // Auto-seed de sócios padrão na primeira carga (apenas o próprio franqueado, não colaborador)
  useEffect(() => {
    if (!franqueadoUserId || isColaborador || !socios || socios.length > 0) return;
    (async () => {
      const defaults = [
        { nome: "Douglas", percentual: 50, ordem: 0 },
        { nome: "Sócio 2", percentual: 25, ordem: 1 },
        { nome: "Sócio 3", percentual: 25, ordem: 2 },
      ].map((s) => ({ ...s, franqueado_user_id: franqueadoUserId }));
      const { error } = await (supabase as any).from("franqueado_socios").insert(defaults);
      if (!error) qc.invalidateQueries({ queryKey: ["franqueado-socios", franqueadoUserId] });
    })();
  }, [franqueadoUserId, isColaborador, socios, qc]);

  const { data: despesas, isLoading: loadingDespesas } = useQuery({
    queryKey: despesasKey,
    enabled: !!franqueadoUserId,
    queryFn: async (): Promise<Despesa[]> => {
      const { data, error } = await (supabase as any)
        .from("franqueado_despesas")
        .select("*")
        .eq("franqueado_user_id", franqueadoUserId)
        .eq("competencia", competencia)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Despesa[];
    },
  });

  const addMut = useMutation({
    mutationFn: async (form: DespesaForm) => {
      const valor = Number(form.valor.replace(",", "."));
      if (!form.descricao.trim() || !valor || valor <= 0) throw new Error("Preencha descrição e valor");

      // Monta as competências (recorrente = N meses a partir da competência atual)
      const meses = form.recorrente ? Math.min(Math.max(Number(form.meses) || 12, 1), 60) : 1;
      const recorrencia_id = form.recorrente
        ? (globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`)
        : null;

      const [yStr, mStr] = competencia.split("-");
      const baseYear = Number(yStr);
      const baseMonth = Number(mStr); // 1-12
      const rows = Array.from({ length: meses }).map((_, i) => {
        const total = baseMonth - 1 + i;
        const y = baseYear + Math.floor(total / 12);
        const m = (total % 12) + 1;
        const comp = `${y}-${String(m).padStart(2, "0")}`;
        return {
          franqueado_user_id: franqueadoUserId,
          descricao: form.descricao.trim(),
          categoria: form.categoria.trim() || null,
          tipo: form.tipo,
          valor,
          competencia: comp,
          observacao: form.observacao.trim() || null,
          created_by: userId,
          recorrente: form.recorrente,
          recorrencia_id,
        };
      });

      const { error } = await (supabase as any).from("franqueado_despesas").insert(rows);
      if (error) throw error;
      return { meses };
    },
    onSuccess: (r) => {
      toast.success(r.meses > 1 ? `Programado em ${r.meses} meses` : "Lançamento adicionado");
      qc.invalidateQueries({ queryKey: despesasKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao adicionar"),
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("franqueado_despesas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Excluído");
      qc.invalidateQueries({ queryKey: despesasKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const delSerieMut = useMutation({
    mutationFn: async (d: Despesa) => {
      if (!d.recorrencia_id) throw new Error("Não é uma série recorrente");
      // Remove apenas a competência atual e futuras (mantém histórico já pago)
      const { error } = await (supabase as any)
        .from("franqueado_despesas")
        .delete()
        .eq("recorrencia_id", d.recorrencia_id)
        .gte("competencia", d.competencia);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Série encerrada a partir deste mês");
      qc.invalidateQueries({ queryKey: despesasKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const togglePagoMut = useMutation({
    mutationFn: async (d: Despesa) => {
      const { error } = await (supabase as any)
        .from("franqueado_despesas")
        .update({ pago: !d.pago })
        .eq("id", d.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: despesasKey }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const updateSocioMut = useMutation({
    mutationFn: async (s: Partial<Socio> & { id: string }) => {
      const { id, ...patch } = s;
      const { error } = await (supabase as any).from("franqueado_socios").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sócio atualizado");
      qc.invalidateQueries({ queryKey: sociosKey });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const addSocioMut = useMutation({
    mutationFn: async () => {
      const ordem = socios?.length ?? 0;
      const { error } = await (supabase as any).from("franqueado_socios").insert({
        franqueado_user_id: franqueadoUserId,
        nome: `Sócio ${ordem + 1}`,
        percentual: 0,
        ordem,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sociosKey }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const delSocioMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("franqueado_socios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: sociosKey }),
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return {
    socios,
    loadingSocios,
    despesas,
    loadingDespesas,
    addMut,
    delMut,
    delSerieMut,
    togglePagoMut,
    updateSocioMut,
    addSocioMut,
    delSocioMut,
  };
}

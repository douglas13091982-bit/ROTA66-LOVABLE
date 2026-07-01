import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Handshake } from "lucide-react";

export function RevendedorSelectSection({ lojaId, revendedorIdAtual, onChanged }: { lojaId: string; revendedorIdAtual: string | null; onChanged: () => void }) {
  const qc = useQueryClient();
  const { data: revs, isLoading } = useQuery({
    queryKey: ["revendedores-lista-select"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("revendedores")
        .select("user_id,nome,email,ativo")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data as Array<{ user_id: string; nome: string; email: string }>;
    },
  });

  const mut = useMutation({
    mutationFn: async (revendedor_id: string | null) => {
      const { error } = await supabase.from("lojas").update({ revendedor_id } as any).eq("id", lojaId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Revendedor atualizado");
      qc.invalidateQueries();
      onChanged();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  return (
    <section className="border-t border-border pt-4">
      <div className="flex items-center gap-2 mb-2">
        <Handshake className="h-4 w-4" />
        <h3 className="font-semibold text-sm">Revendedor responsável</h3>
      </div>
      <select
        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
        disabled={isLoading || mut.isPending}
        value={revendedorIdAtual ?? ""}
        onChange={(e) => mut.mutate(e.target.value || null)}
      >
        <option value="">— Sem revendedor (direto com o super admin)</option>
        {(revs ?? []).map((r) => (
          <option key={r.user_id} value={r.user_id}>{r.nome} · {r.email}</option>
        ))}
      </select>
    </section>
  );
}

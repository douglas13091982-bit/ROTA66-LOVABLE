import { RevendedorShell } from "@/components/RevendedorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";

export function RevendedorPerfilPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["revendedor-perfil", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("revendedores")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return (
    <RevendedorShell title="Perfil">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-white mb-6">Meu perfil</h1>
        {!data ? (
          <div className="text-white/60 text-sm">Perfil não encontrado.</div>
        ) : (
          <div className="pp-card rounded-2xl p-6 space-y-3">
            <Row label="Nome" value={data.nome} />
            <Row label="E-mail" value={data.email} />
            <Row label="Telefone" value={data.telefone ?? "—"} />
            <Row label="Documento" value={data.documento ?? "—"} />
            <div className="h-px bg-white/10 my-3" />
            <Row label="Mensalidade fixa" value={`R$ ${Number(data.mensalidade_valor).toFixed(2)}`} />
            <Row label="% sobre a receita" value={`${Number(data.percentual_receita).toFixed(2)}%`} />
            <Row label="Dia de vencimento" value={String(data.dia_vencimento)} />
            <Row label="Status" value={data.ativo ? "Ativo" : "Inativo"} />
          </div>
        )}
      </div>
    </RevendedorShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-white/60">{label}</span>
      <span className="text-white font-semibold">{value}</span>
    </div>
  );
}

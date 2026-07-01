import { RevendedorShell } from "@/components/RevendedorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";

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

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const linkIndicacao = data?.codigo_indicacao
    ? `${origin}/cadastro?role=loja_admin&ref=${data.codigo_indicacao}`
    : "";

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success("Copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <RevendedorShell title="Perfil">
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold text-white">Meu perfil</h1>
        {!data ? (
          <div className="text-white/60 text-sm">Perfil não encontrado.</div>
        ) : (
          <>
            <div className="pp-card rounded-2xl p-6 space-y-3">
              <Row label="Nome" value={data.nome} />
              <Row label="E-mail" value={data.email} />
              <Row label="Telefone" value={data.telefone ?? "—"} />
              <Row label="Documento" value={data.documento ?? "—"} />
              <div className="h-px bg-white/10 my-3" />
              <Row label="Mensalidade fixa" value={`R$ ${Number(data.mensalidade_valor).toFixed(2)}`} />
              <Row label="Minha comissão" value={`${Number(data.percentual_receita).toFixed(2)}%`} />
              <Row label="Dia de vencimento" value={String(data.dia_vencimento)} />
              <Row label="Status" value={data.ativo ? "Ativo" : "Inativo"} />
            </div>

            <div className="pp-card rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-lg font-bold text-white">Link de indicação de lojas</h2>
                <p className="text-sm text-white/60 mt-1">
                  Compartilhe este link. Toda loja que se cadastrar por ele será
                  automaticamente vinculada ao seu perfil.
                </p>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase text-white/50">Seu código</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-emerald-300 font-mono text-sm">
                    {data.codigo_indicacao ?? "—"}
                  </code>
                  {data.codigo_indicacao && (
                    <button
                      type="button"
                      onClick={() => copiar(data.codigo_indicacao)}
                      className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white"
                      aria-label="Copiar código"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs uppercase text-white/50">Link completo</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-black/30 px-3 py-2 text-white/90 text-xs break-all">
                    {linkIndicacao || "—"}
                  </code>
                  {linkIndicacao && (
                    <button
                      type="button"
                      onClick={() => copiar(linkIndicacao)}
                      className="rounded-lg bg-emerald-500 hover:bg-emerald-600 p-2 text-white"
                      aria-label="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
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

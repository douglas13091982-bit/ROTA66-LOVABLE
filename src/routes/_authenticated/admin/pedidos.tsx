import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { EntregadorNomeBadge } from "@/components/EntregadorNomeBadge";

export const Route = createFileRoute("/_authenticated/admin/pedidos")({
  component: AdminPedidos,
});

const STATUS_COLOR: Record<string, string> = {
  novo: "bg-primary text-primary-foreground",
  aceito: "bg-blue-600 text-white",
  em_preparo: "bg-amber-600 text-white",
  pronto: "bg-purple-600 text-white",
  em_rota: "bg-indigo-600 text-white",
  entregue: "bg-green-600 text-white",
  cancelado: "bg-zinc-600 text-white",
};

function AdminPedidos() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-pedidos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pedidos")
        .select("*, lojas(nome, slug)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  return (
    <AdminShell title="Pedidos da Plataforma">
      {isLoading && <p className="text-muted-foreground">Carregando...</p>}
      <div className="bg-card border border-border rounded-lg shadow-card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead className="bg-background">
            <tr className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <th className="text-left p-4">#</th>
              <th className="text-left p-4">Loja</th>
              <th className="text-left p-4">Cliente</th>
              <th className="text-left p-4">Total</th>
              <th className="text-left p-4">Entregador</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Data</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-4 font-display text-lg">#{p.numero}</td>
                <td className="p-4">{p.lojas?.nome ?? "—"}</td>
                <td className="p-4">{p.cliente_nome}</td>
                <td className="p-4 text-primary font-bold">R$ {Number(p.valor_total).toFixed(2)}</td>
                <td className="p-4">
                  {p.entregador_id ? <EntregadorNomeBadge pedidoId={p.id} /> : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${STATUS_COLOR[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-4 text-muted-foreground text-sm">
                  {new Date(p.created_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
            {data && data.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum pedido ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

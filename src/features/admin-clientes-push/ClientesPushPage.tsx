import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BellRing, Search, Users, Smartphone, Lock } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useAuth } from "@/hooks/use-auth";
import { useFranquia } from "@/hooks/use-franquia";
import { Input } from "@/components/ui/input";
import { listarClientesComPush } from "@/lib/push-admin.functions";

export function ClientesPushPage() {
  const { roles } = useAuth();
  const { isFranqueado, isColaborador } = useFranquia();
  const permitido = roles.includes("super_admin") || isFranqueado || isColaborador;

  return (
    <AdminShell title="Clientes com push ativo">
      {permitido ? (
        <Conteudo />
      ) : (
        <div className="max-w-md mx-auto mt-12 text-center pp-card rounded-2xl p-8">
          <Lock className="h-10 w-10 mx-auto text-white/40 mb-3" />
          <div className="text-lg font-semibold text-white mb-1">Acesso restrito</div>
          <div className="text-sm text-white/60">Apenas super admin, franqueado ou colaborador.</div>
        </div>
      )}
    </AdminShell>
  );
}

function Conteudo() {
  const listar = useServerFn(listarClientesComPush);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-clientes-push"],
    queryFn: () => listar(),
    refetchInterval: 30000,
  });

  const [busca, setBusca] = useState("");
  const clientes = data?.clientes ?? [];

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.cidade || "").toLowerCase().includes(q)
    );
  }, [clientes, busca]);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-4xl">
      <div className="pp-glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <BellRing className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Clientes com notificação ativa</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Lista de clientes cadastrados que autorizaram receber notificações push
          {data?.cityId ? " na sua cidade" : ""}. Use estas informações para direcionar promoções.
        </p>
        <div className="mt-4 flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary font-semibold">
            <Users className="w-4 h-4" /> {clientes.length} cliente(s)
          </span>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            {clientes.reduce((s, c) => s + c.dispositivos, 0)} dispositivo(s)
          </span>
        </div>
      </div>

      <div className="pp-glass rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou cidade…"
            className="h-9"
          />
        </div>

        <div className="border rounded-lg divide-y max-h-[70vh] overflow-y-auto">
          {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando…</div>}
          {!isLoading && filtrados.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              Nenhum cliente com push ativo encontrado.
            </div>
          )}
          {filtrados.map((c) => (
            <div key={c.id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.nome}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {c.phone || "sem telefone"}
                  {c.cidade ? ` · ${c.cidade}${c.estado ? "/" + c.estado : ""}` : ""}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold">
                  <Smartphone className="w-3 h-3" />
                  {c.dispositivos}
                </div>
                {c.ultima_inscricao && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(c.ultima_inscricao).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

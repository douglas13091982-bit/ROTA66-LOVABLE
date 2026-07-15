import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, Plus, Trash2 } from "lucide-react";
import {
  listarColaboradores,
  adicionarColaborador,
  removerColaborador,
  type Colaborador,
} from "@/lib/franqueado-colaboradores.functions";
import { toast } from "sonner";

export function ColaboradoresSection() {
  const qc = useQueryClient();
  const listar = useServerFn(listarColaboradores);
  const adicionar = useServerFn(adicionarColaborador);
  const remover = useServerFn(removerColaborador);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["franq-colaboradores"],
    queryFn: () => listar(),
  });

  const addM = useMutation({
    mutationFn: (v: { email: string; senha: string }) => adicionar({ data: v }),
    onSuccess: () => {
      toast.success("Colaborador adicionado");
      setEmail("");
      setSenha("");
      qc.invalidateQueries({ queryKey: ["franq-colaboradores"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao adicionar"),
  });

  const rmM = useMutation({
    mutationFn: (id: string) => remover({ data: { id } }),
    onSuccess: () => {
      toast.success("Colaborador removido");
      qc.invalidateQueries({ queryKey: ["franq-colaboradores"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover"),
  });

  const list = (data ?? []) as Colaborador[];

  return (
    <section className="pp-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="h-5 w-5 text-white/80" />
        <h2 className="text-lg font-semibold text-white">Colaboradores</h2>
      </div>
      <p className="text-xs text-white/60 mb-4">
        Adicione outras pessoas para acessar seu painel (mesmas informações da sua cidade, exceto
        <strong> Minha franquia</strong>). Se o e-mail ainda não tiver conta, informe uma senha e a conta será
        criada automaticamente.
      </p>

      <form
        className="grid gap-2 sm:grid-cols-[1fr_180px_auto] mb-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) addM.mutate({ email: email.trim(), senha });
        }}
      >
        <input
          type="email"
          required
          placeholder="email@colaborador.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
        />
        <input
          type="text"
          placeholder="senha (se novo)"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
        />
        <button
          type="submit"
          disabled={addM.isPending}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-black text-sm disabled:opacity-60"
          style={{ background: "var(--rota-gold)" }}
        >
          <Plus className="h-4 w-4" /> {addM.isPending ? "Adicionando…" : "Adicionar"}
        </button>
      </form>

      {isLoading ? (
        <div className="text-white/50 text-sm">Carregando…</div>
      ) : !list.length ? (
        <div className="text-white/50 text-sm">Nenhum colaborador ainda.</div>
      ) : (
        <div className="space-y-2">
          {list.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02]"
            >
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">{c.email ?? c.colaborador_user_id}</div>
                {c.nome && <div className="text-xs text-white/50 truncate">{c.nome}</div>}
              </div>
              <button
                onClick={() => {
                  if (confirm("Remover este colaborador?")) rmM.mutate(c.id);
                }}
                disabled={rmM.isPending}
                className="h-8 w-8 grid place-items-center rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
                aria-label="Remover"
                title="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

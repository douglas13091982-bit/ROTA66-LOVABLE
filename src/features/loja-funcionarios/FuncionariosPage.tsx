import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, KeyRound, Trash2, Users } from "lucide-react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja, useIsLojaOwner } from "@/hooks/use-loja";
import {
  criarFuncionario,
  listarFuncionarios,
  removerFuncionario,
  redefinirSenhaFuncionario,
} from "@/lib/loja-funcionarios.functions";

export function FuncionariosPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: loja, isLoading: loadingLoja } = useMinhaLoja();
  const isOwner = useIsLojaOwner(loja);

  const listFn = useServerFn(listarFuncionarios);
  const criarFn = useServerFn(criarFuncionario);
  const removerFn = useServerFn(removerFuncionario);
  const senhaFn = useServerFn(redefinirSenhaFuncionario);

  const { data, isLoading } = useQuery({
    queryKey: ["loja-funcionarios"],
    enabled: !!loja && isOwner,
    queryFn: () => listFn({}),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["loja-funcionarios"] });

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [novaSenhaId, setNovaSenhaId] = useState<string | null>(null);
  const [novaSenha, setNovaSenha] = useState("");

  const criar = useMutation({
    mutationFn: (input: { nome: string; email: string; senha: string }) => criarFn({ data: input }),
    onSuccess: () => {
      toast.success("Funcionário criado");
      setNome(""); setEmail(""); setSenha("");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const remover = useMutation({
    mutationFn: (user_id: string) => removerFn({ data: { user_id } }),
    onSuccess: () => { toast.success("Funcionário removido"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  const trocarSenha = useMutation({
    mutationFn: (v: { user_id: string; senha: string }) => senhaFn({ data: v }),
    onSuccess: () => { toast.success("Senha atualizada"); setNovaSenhaId(null); setNovaSenha(""); },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });

  if (!loadingLoja && loja && !isOwner) {
    return (
      <LojaShell title="Funcionários">
        <div className="max-w-lg text-sm text-white/70">
          Apenas o dono da loja pode gerenciar funcionários.
          <button
            className="ml-2 underline"
            onClick={() => navigate({ to: "/loja/dashboard" })}
          >
            Voltar ao dashboard
          </button>
        </div>
      </LojaShell>
    );
  }

  const max = data?.max ?? 0;
  const usados = data?.usados ?? 0;
  const restantes = Math.max(0, max - usados);
  const podeCriar = restantes > 0;

  return (
    <LojaShell title="Funcionários">
      <div className="max-w-3xl space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gradient-red grid place-items-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Funcionários da loja</h2>
              <p className="text-xs text-muted-foreground">
                {max > 0
                  ? `${usados} de ${max} usados no seu plano`
                  : "Seu plano atual não inclui funcionários. Faça upgrade para adicionar."}
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); criar.mutate({ nome, email, senha }); }}
            className="grid sm:grid-cols-2 gap-3"
          >
            <label className="block sm:col-span-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} required
                     className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                     className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Senha</span>
              <input type="text" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6}
                     className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                     placeholder="Mín. 6 caracteres" />
            </label>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!podeCriar || criar.isPending}
                className="inline-flex items-center gap-2 bg-gradient-red shadow-red text-primary-foreground font-bold px-4 py-2 rounded-md disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" />
                {criar.isPending ? "Criando..." : "Adicionar funcionário"}
              </button>
              {!podeCriar && max > 0 && (
                <span className="ml-3 text-xs text-amber-400">
                  Limite do plano atingido. Faça upgrade para adicionar mais.
                </span>
              )}
            </div>
          </form>
        </div>

        <div className="bg-card border border-border rounded-lg shadow-card overflow-hidden">
          <div className="px-6 py-3 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lista de funcionários
          </div>
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando...</div>
          ) : (data?.funcionarios ?? []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">Nenhum funcionário cadastrado ainda.</div>
          ) : (
            <ul className="divide-y divide-border">
              {data!.funcionarios.map((f: any) => (
                <li key={f.id} className="px-6 py-4 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="font-semibold text-sm">{f.nome}</div>
                    <div className="text-xs text-muted-foreground">{f.email}</div>
                  </div>
                  <button
                    onClick={() => setNovaSenhaId(f.user_id)}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Redefinir senha
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remover acesso de ${f.nome}? Essa ação é permanente.`))
                        remover.mutate(f.user_id);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-red-600/20 border border-red-600/40 text-red-300 hover:bg-red-600/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </button>
                  {novaSenhaId === f.user_id && (
                    <div className="basis-full flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Nova senha (mín. 6)"
                        className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => trocarSenha.mutate({ user_id: f.user_id, senha: novaSenha })}
                        disabled={trocarSenha.isPending}
                        className="text-xs px-3 py-2 rounded-md bg-gradient-red text-white font-bold disabled:opacity-50"
                      >
                        Salvar
                      </button>
                      <button
                        onClick={() => { setNovaSenhaId(null); setNovaSenha(""); }}
                        className="text-xs px-3 py-2 rounded-md bg-white/5 border border-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </LojaShell>
  );
}

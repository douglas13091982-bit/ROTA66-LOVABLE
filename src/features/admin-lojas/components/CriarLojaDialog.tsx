import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2, Store } from "lucide-react";
import { criarLojaManual } from "@/lib/lojas-admin.functions";
import { useCidades } from "@/hooks/use-cidades";
import { useFranquia } from "@/hooks/use-franquia";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CriarLojaDialog({ open, onClose, onCreated }: Props) {
  const criar = useServerFn(criarLojaManual);
  const { cidades } = useCidades();
  const { cidade: cidadeFranqueado } = useFranquia();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nomeResp, setNomeResp] = useState("");
  const [nomeLoja, setNomeLoja] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cityId, setCityId] = useState("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  // Se franqueado/colaborador restrito, filtra cidades
  const cidadesDisponiveis = cidadeFranqueado
    ? cidades.filter((c) => c.nome.toLowerCase() === cidadeFranqueado.toLowerCase())
    : cidades;

  const reset = () => {
    setEmail("");
    setSenha("");
    setNomeResp("");
    setNomeLoja("");
    setTelefone("");
    setCityId("");
  };

  const gerarSenha = () => {
    const s = Math.random().toString(36).slice(2, 6) + Math.random().toString(36).slice(2, 6).toUpperCase() + "@1";
    setSenha(s);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await criar({
        data: {
          email: email.trim(),
          senha: senha.trim(),
          nome_responsavel: nomeResp.trim(),
          nome_loja: nomeLoja.trim(),
          telefone: telefone.trim() || undefined,
          city_id: cityId,
        },
      });
      toast.success("Loja criada com sucesso!");
      reset();
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao criar loja");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Cadastrar nova loja</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Cadastro manual com e-mail e senha temporários. A loja poderá alterar a
            senha depois pelo painel.
          </p>

          <Field label="Nome da loja *">
            <input
              value={nomeLoja}
              onChange={(e) => setNomeLoja(e.target.value)}
              required
              maxLength={120}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              placeholder="Ex.: Pizzaria do Zé"
            />
          </Field>

          <Field label="Nome do responsável *">
            <input
              value={nomeResp}
              onChange={(e) => setNomeResp(e.target.value)}
              required
              maxLength={120}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Telefone">
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              maxLength={20}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
              placeholder="(11) 99999-9999"
            />
          </Field>

          <Field label="Cidade *">
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              required
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
            >
              <option value="">Selecione…</option>
              {cidadesDisponiveis.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} / {c.uf}
                </option>
              ))}
            </select>
            {cidadeFranqueado && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Cidade fixa: {cidadeFranqueado}
              </p>
            )}
          </Field>

          <div className="border-t border-border pt-3 mt-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Acesso da loja
            </p>

            <Field label="E-mail *">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                required
                maxLength={254}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
                placeholder="loja@exemplo.com"
              />
            </Field>

            <Field label="Senha temporária *">
              <div className="flex gap-2">
                <input
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                  className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-sm font-mono"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={gerarSenha}
                  className="px-3 py-2 text-xs bg-secondary border border-border rounded-md hover:bg-secondary/80"
                >
                  Gerar
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Anote e envie ao lojista. Ele poderá trocar depois.
              </p>
            </Field>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-secondary border border-border rounded-md hover:bg-secondary/80"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Criando…" : "Cadastrar loja"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

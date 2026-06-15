import { useState } from "react";
import { UserPlus } from "lucide-react";
import { emptyPerms, type PermState } from "../logic/perms";
import { PermissoesGrid } from "./PermissoesGrid";

export function ConcederAcessoSection({
  onConceder,
  isPending,
}: {
  onConceder: (vars: { email: string; perms: PermState }) => void;
  isPending: boolean;
}) {
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<PermState>(emptyPerms);

  const submit = () => {
    onConceder({ email, perms });
    setEmail("");
    setPerms(emptyPerms());
  };

  return (
    <section className="pp-card rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <UserPlus className="h-5 w-5 text-white/80" />
        <h2 className="text-lg font-semibold text-white">Conceder acesso de admin</h2>
      </div>
      <p className="text-sm text-white/55 mb-4">
        O usuário precisa já ter uma conta cadastrada. Informe o email dele e marque as áreas que poderá acessar.
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-white/60 mb-1">Email do usuário</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@exemplo.com"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/30"
          />
        </div>

        <PermissoesGrid perms={perms} onChange={setPerms} />

        <button
          disabled={!email || isPending}
          onClick={submit}
          className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg px-4 py-2 text-sm"
        >
          {isPending ? "Salvando…" : "Conceder acesso"}
        </button>
      </div>
    </section>
  );
}

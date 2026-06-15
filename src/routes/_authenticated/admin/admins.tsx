import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminShell } from "@/components/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Trash2, Save, UserPlus, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/admins")({
  component: AdminAdmins,
});

const AREAS: { key: string; label: string }[] = [
  { key: "lojas", label: "Lojas" },
  { key: "entregadores", label: "Entregadores" },
  { key: "financeiro", label: "Financeiro" },
  { key: "creditos", label: "Créditos do entregador" },
  { key: "tarifas", label: "Tarifas" },
  { key: "roteirizacao", label: "Roteirização" },
  { key: "branding", label: "Identidade visual" },
  { key: "anuncios", label: "Anúncios" },
  { key: "notificacao_som", label: "Som de alerta" },
  { key: "pedidos", label: "Pedidos" },
  { key: "app_apk", label: "App APK" },
];

type AdminRow = {
  user_id: string;
  email: string;
  full_name: string | null;
  is_super: boolean;
  permissoes: Record<string, { can_write: boolean }>;
};

function AdminAdmins() {
  const { roles } = useAuth();
  const isSuper = roles.includes("super_admin");
  const qc = useQueryClient();

  const { data: admins, isLoading } = useQuery({
    queryKey: ["listar-admins"],
    enabled: isSuper,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("listar_admins" as any);
      if (error) throw error;
      return (data ?? []) as AdminRow[];
    },
  });

  const [novoEmail, setNovoEmail] = useState("");
  const [novoPerms, setNovoPerms] = useState<Record<string, { enabled: boolean; can_write: boolean }>>(() =>
    Object.fromEntries(AREAS.map((a) => [a.key, { enabled: false, can_write: false }]))
  );

  const conceder = useMutation({
    mutationFn: async () => {
      const permissoes: Record<string, { can_write: boolean }> = {};
      for (const [k, v] of Object.entries(novoPerms)) {
        if (v.enabled) permissoes[k] = { can_write: v.can_write };
      }
      const { error } = await supabase.rpc("conceder_admin" as any, {
        _email: novoEmail.trim(),
        _permissoes: permissoes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso de admin concedido");
      setNovoEmail("");
      setNovoPerms(Object.fromEntries(AREAS.map((a) => [a.key, { enabled: false, can_write: false }])));
      qc.invalidateQueries({ queryKey: ["listar-admins"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Falha ao conceder acesso"),
  });

  if (!isSuper) {
    return (
      <AdminShell title="Administradores">
        <div className="text-white/60">Apenas o super admin pode gerenciar administradores.</div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Administradores">
      <div className="max-w-4xl space-y-8">
        {/* Conceder acesso */}
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
                value={novoEmail}
                onChange={(e) => setNovoEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-white/30"
              />
            </div>

            <div className="border border-white/10 rounded-xl divide-y divide-white/5">
              {AREAS.map((a) => {
                const v = novoPerms[a.key];
                return (
                  <div key={a.key} className="flex items-center gap-3 px-4 py-2.5">
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={v.enabled}
                        onChange={(e) =>
                          setNovoPerms((p) => ({
                            ...p,
                            [a.key]: { enabled: e.target.checked, can_write: e.target.checked ? p[a.key].can_write : false },
                          }))
                        }
                      />
                      <span className="text-sm text-white">{a.label}</span>
                    </label>
                    <label className={`flex items-center gap-1.5 text-xs ${v.enabled ? "text-white/80" : "text-white/30"}`}>
                      <input
                        type="checkbox"
                        disabled={!v.enabled}
                        checked={v.can_write}
                        onChange={(e) =>
                          setNovoPerms((p) => ({ ...p, [a.key]: { ...p[a.key], can_write: e.target.checked } }))
                        }
                      />
                      Pode editar
                    </label>
                  </div>
                );
              })}
            </div>

            <button
              disabled={!novoEmail || conceder.isPending}
              onClick={() => conceder.mutate()}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg px-4 py-2 text-sm"
            >
              {conceder.isPending ? "Salvando…" : "Conceder acesso"}
            </button>
          </div>
        </section>

        {/* Lista */}
        <section className="pp-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-5 w-5 text-white/80" />
            <h2 className="text-lg font-semibold text-white">Admins cadastrados</h2>
          </div>
          {isLoading ? (
            <div className="text-white/50 text-sm">Carregando…</div>
          ) : !admins || admins.length === 0 ? (
            <div className="text-white/50 text-sm">Nenhum admin cadastrado ainda.</div>
          ) : (
            <div className="space-y-3">
              {admins.map((a) => (
                <AdminRowItem key={a.user_id} admin={a} onChanged={() => qc.invalidateQueries({ queryKey: ["listar-admins"] })} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function AdminRowItem({ admin, onChanged }: { admin: AdminRow; onChanged: () => void }) {
  const initial = useMemo(() => {
    const m: Record<string, { enabled: boolean; can_write: boolean }> = {};
    for (const a of AREAS) {
      const p = admin.permissoes?.[a.key];
      m[a.key] = { enabled: !!p, can_write: !!p?.can_write };
    }
    return m;
  }, [admin]);
  const [perms, setPerms] = useState(initial);
  const [open, setOpen] = useState(false);

  const salvar = useMutation({
    mutationFn: async () => {
      const permissoes: Record<string, { can_write: boolean }> = {};
      for (const [k, v] of Object.entries(perms)) {
        if (v.enabled) permissoes[k] = { can_write: v.can_write };
      }
      const { error } = await supabase.rpc("conceder_admin" as any, {
        _email: admin.email,
        _permissoes: permissoes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas");
      onChanged();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });

  const revogar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("revogar_admin" as any, { _user_id: admin.user_id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Acesso revogado");
      onChanged();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao revogar"),
  });

  if (admin.is_super) {
    return (
      <div className="flex items-center justify-between border border-white/10 rounded-xl px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-white">{admin.full_name ?? admin.email}</div>
          <div className="text-xs text-white/50">{admin.email}</div>
        </div>
        <span className="text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-300 px-2 py-1 rounded-full">Super admin</span>
      </div>
    );
  }

  return (
    <div className="border border-white/10 rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <div className="text-sm font-semibold text-white">{admin.full_name ?? admin.email}</div>
          <div className="text-xs text-white/50">{admin.email}</div>
        </div>
        <span className="text-xs text-white/60">{open ? "Fechar" : "Editar"}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          <div className="border border-white/10 rounded-lg divide-y divide-white/5">
            {AREAS.map((a) => {
              const v = perms[a.key];
              return (
                <div key={a.key} className="flex items-center gap-3 px-3 py-2">
                  <label className="flex items-center gap-2 flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.enabled}
                      onChange={(e) =>
                        setPerms((p) => ({
                          ...p,
                          [a.key]: { enabled: e.target.checked, can_write: e.target.checked ? p[a.key].can_write : false },
                        }))
                      }
                    />
                    <span className="text-sm text-white">{a.label}</span>
                  </label>
                  <label className={`flex items-center gap-1.5 text-xs ${v.enabled ? "text-white/80" : "text-white/30"}`}>
                    <input
                      type="checkbox"
                      disabled={!v.enabled}
                      checked={v.can_write}
                      onChange={(e) =>
                        setPerms((p) => ({ ...p, [a.key]: { ...p[a.key], can_write: e.target.checked } }))
                      }
                    />
                    Pode editar
                  </label>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => salvar.mutate()}
              disabled={salvar.isPending}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-black font-semibold rounded-lg px-3 py-1.5 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {salvar.isPending ? "Salvando…" : "Salvar"}
            </button>
            <button
              onClick={() => {
                if (confirm(`Revogar acesso de admin de ${admin.email}?`)) revogar.mutate();
              }}
              disabled={revogar.isPending}
              className="flex items-center gap-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Revogar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

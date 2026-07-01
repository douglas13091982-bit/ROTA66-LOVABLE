import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Store, XCircle, Clock, LogIn } from "lucide-react";
import { aceitarConviteLoja, getConviteLojaPublico } from "@/lib/convites-loja.functions";
import { supabase } from "@/integrations/supabase/client";
import { GlobalErrorBoundary } from "@/components/GlobalErrorBoundary";

export const Route = createFileRoute("/convite-loja/$token")({
  head: () => ({ meta: [{ title: "Convite de vínculo de loja — ROTA 66" }] }),
  errorComponent: ({ error, reset }) => <GlobalErrorBoundary error={error} reset={reset} />,
  notFoundComponent: () => <GlobalErrorBoundary statusCode={404} />,
  component: ConvitePage,
});

const PENDING_KEY = "convite_loja_pending_token";

function ConvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const getPublico = useServerFn(getConviteLojaPublico);
  const aceitar = useServerFn(aceitarConviteLoja);

  const [sessionUserId, setSessionUserId] = useState<string | null | undefined>(undefined);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return;
      const uid = data.user?.id ?? null;
      setSessionUserId(uid);
      if (uid) {
        const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        if (mounted) setRoles((r ?? []).map((x: any) => x.role));
      }
    });
    return () => { mounted = false; };
  }, []);

  const { data: convite, isLoading, error } = useQuery({
    queryKey: ["convite-loja-publico", token],
    queryFn: () => getPublico({ data: { token } }),
    retry: false,
  });

  const aceitarMut = useMutation({
    mutationFn: async () => aceitar({ data: { token } }),
    onSuccess: (res) => {
      toast.success(`Loja "${res.loja_nome}" vinculada ao seu perfil!`);
      sessionStorage.removeItem(PENDING_KEY);
      navigate({ to: "/revendedor/lojas" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível aceitar o convite"),
  });

  const goLogin = () => {
    try { sessionStorage.setItem(PENDING_KEY, token); } catch {}
    navigate({ to: "/login" });
  };

  const isRevendedor = roles.includes("revendedor") || roles.includes("super_admin");

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-[var(--rota-navy,#0b1220)]">
      <div className="w-full max-w-md pp-card rounded-2xl p-6 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-6 w-6" style={{ color: "var(--rota-gold)" }} />
          <h1 className="text-xl font-bold text-white">Convite de loja</h1>
        </div>

        {isLoading && <div className="text-white/60 text-sm">Carregando convite…</div>}

        {error && (
          <div className="text-center py-6">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <div className="text-white font-semibold mb-1">Convite inválido</div>
            <div className="text-sm text-white/60">Este link não é válido ou foi removido.</div>
          </div>
        )}

        {convite && (
          <>
            <div className="rounded-xl bg-white/5 p-4 mb-4">
              <div className="text-xs text-white/50 uppercase tracking-wide">Loja</div>
              <div className="text-white font-semibold text-lg">{convite.loja_nome}</div>
              <div className="text-xs text-white/60 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expira em {new Date(convite.expira_em).toLocaleDateString("pt-BR")} às {new Date(convite.expira_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
              {convite.email_destinatario && (
                <div className="text-xs text-white/60 mt-1">Destinado a: {convite.email_destinatario}</div>
              )}
            </div>

            {convite.status !== "pendente" ? (
              <div className="text-center py-4">
                {convite.status === "aceito" && <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />}
                {convite.status === "expirado" && <Clock className="h-10 w-10 text-zinc-400 mx-auto mb-2" />}
                {convite.status === "cancelado" && <XCircle className="h-10 w-10 text-red-400 mx-auto mb-2" />}
                <div className="text-white font-semibold capitalize">Convite {convite.status}</div>
                <div className="text-sm text-white/60 mt-1">
                  {convite.status === "aceito" && "Esta loja já foi vinculada."}
                  {convite.status === "expirado" && "Peça ao super admin para gerar um novo link."}
                  {convite.status === "cancelado" && "Este convite foi cancelado pelo super admin."}
                </div>
              </div>
            ) : sessionUserId === undefined ? (
              <div className="text-white/60 text-sm">Verificando sessão…</div>
            ) : !sessionUserId ? (
              <div>
                <p className="text-sm text-white/70 mb-3">
                  Faça login com sua conta de revendedor para vincular esta loja.
                </p>
                <button
                  onClick={goLogin}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-black"
                  style={{ background: "var(--rota-gold)" }}
                >
                  <LogIn className="h-4 w-4" /> Fazer login e aceitar
                </button>
              </div>
            ) : !isRevendedor ? (
              <div className="text-center py-3">
                <XCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                <div className="text-white font-semibold">Perfil incompatível</div>
                <div className="text-sm text-white/60 mt-1">
                  Este link é válido apenas para contas de revendedor.
                </div>
              </div>
            ) : (
              <button
                onClick={() => aceitarMut.mutate()}
                disabled={aceitarMut.isPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-black disabled:opacity-60"
                style={{ background: "var(--rota-gold)" }}
              >
                {aceitarMut.isPending ? "Vinculando…" : "Aceitar e vincular loja"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

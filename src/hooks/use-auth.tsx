import { useEffect, useState, createContext, useContext, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "loja_admin" | "entregador" | "cliente" | "revendedor";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  hasRole: (r: AppRole) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRoles = async (uid: string) => {
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        (supabase as any)
          .from("franqueado_colaboradores")
          .select("id")
          .eq("colaborador_user_id", uid)
          .eq("ativo", true)
          .maybeSingle(),
      ]);
      const list = (r ?? []).map((x) => x.role as AppRole);
      if (c && !list.includes("super_admin")) list.push("super_admin");
      return list;
    };

    let currentUserId: string | null = null;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Só recarrega roles em transições reais de identidade. Sem esse filtro,
      // TOKEN_REFRESHED (~horário) e INITIAL_SESSION (todo mount) disparavam
      // dezenas de milhares de queries em user_roles por dia.
      if (!newSession?.user) {
        currentUserId = null;
        setRoles([]);
        return;
      }
      const nextId = newSession.user.id;
      const isIdentityEvent =
        event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED";
      if (!isIdentityEvent && currentUserId === nextId) return;
      currentUserId = nextId;
      // Defer role fetch to avoid deadlocks inside the auth callback
      setTimeout(() => {
        loadRoles(nextId).then(setRoles);
      }, 0);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        currentUserId = s.user.id;
        loadRoles(s.user.id).then((list) => {
          setRoles(list);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });


    // Quando o usuário volta ao app depois de um tempo (tela bloqueada,
    // troca de aba, PWA em segundo plano), o token pode ter vencido e o
    // autoRefresh interno do supabase-js pode ter pausado. Forçamos um
    // refresh sempre que a aba volta a ficar visível — se falhar, o
    // onAuthStateChange abaixo cuida do SIGNED_OUT.
    const refrescar = () => {
      if (typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) supabase.auth.refreshSession();
      });
    };
    document.addEventListener("visibilitychange", refrescar);
    window.addEventListener("focus", refrescar);
    window.addEventListener("pageshow", refrescar);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", refrescar);
      window.removeEventListener("focus", refrescar);
      window.removeEventListener("pageshow", refrescar);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (r: AppRole) => roles.includes(r);

  return (
    <AuthContext.Provider value={{ user, session, roles, loading, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

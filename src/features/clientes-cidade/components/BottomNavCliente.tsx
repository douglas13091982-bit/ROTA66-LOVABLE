import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Home, UserRound, UserPlus, LogIn, LogOut, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PerfilDialog } from "./PerfilDialog";
import { PedidosDialog } from "./PedidosDialog";

interface Props {
  cidade: string;
  uf?: string;
}

export function BottomNavCliente({ cidade, uf }: Props) {
  const navigate = useNavigate();
  const [logado, setLogado] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [pedidosOpen, setPedidosOpen] = useState(false);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!cancelled) setLogado(!!data.user);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setLogado(!!session?.user);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSair = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da conta");
    navigate({ to: "/login" });
  };

  const handleInicio = () => {
    navigate({
      to: "/clientes/$cidade",
      params: { cidade: encodeURIComponent(cidade) },
      search: uf ? { uf } : {},
    });
  };

  type Item = { label: string; icon: typeof Home; onClick: () => void; danger?: boolean };

  const items: Item[] = logado
    ? [
        { label: "Início", icon: Home, onClick: handleInicio },
        { label: "Pedidos", icon: ReceiptText, onClick: () => setPedidosOpen(true) },
        { label: "Perfil", icon: UserRound, onClick: () => setPerfilOpen(true) },
        { label: "Sair", icon: LogOut, onClick: handleSair, danger: true },
      ]
    : [
        { label: "Início", icon: Home, onClick: handleInicio },
        { label: "Entrar", icon: LogIn, onClick: () => navigate({ to: "/login" }) },
        {
          label: "Cadastrar",
          icon: UserPlus,
          onClick: () => navigate({ to: "/cadastro", search: { role: "cliente" } }),
        },
      ];

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgba(13,44,84,0.5)]"
        style={{ background: "#ffffff", borderColor: "rgba(13,44,84,0.10)" }}
      >
        <div
          className="grid mx-auto max-w-2xl"
          style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`group relative flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  item.danger ? "text-[#cc2229]" : "text-[#0d2c54] hover:text-[#cc2229]"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={1.8} />
                {item.label}
                {item.label === "Início" && (
                  <span className="absolute bottom-0 h-[3px] w-12 rounded-full bg-[#cc2229]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
      <PerfilDialog open={perfilOpen} onOpenChange={setPerfilOpen} />
      <PedidosDialog open={pedidosOpen} onOpenChange={setPedidosOpen} />
    </>
  );
}

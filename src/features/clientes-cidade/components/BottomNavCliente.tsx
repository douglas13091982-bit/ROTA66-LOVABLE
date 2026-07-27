import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Home, UserRound, Search, Heart, ReceiptText } from "lucide-react";
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

  const handleInicio = () => {
    navigate({
      to: "/clientes/$cidade",
      params: { cidade: encodeURIComponent(cidade) },
      search: uf ? { uf } : {},
    });
  };

  const focarBusca = () => {
    const el = document.querySelector<HTMLInputElement>("input[data-busca-lojas]");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const items = [
    { label: "Início", icon: Home, onClick: handleInicio, active: true },
    { label: "Buscar", icon: Search, onClick: focarBusca, active: false },
    {
      label: "Pedidos",
      icon: ReceiptText,
      onClick: () => (logado ? setPedidosOpen(true) : navigate({ to: "/login" })),
      active: false,
    },
    {
      label: "Favoritos",
      icon: Heart,
      onClick: () => (logado ? setPerfilOpen(true) : navigate({ to: "/login" })),
      active: false,
    },
    {
      label: "Conta",
      icon: UserRound,
      onClick: () => (logado ? setPerfilOpen(true) : navigate({ to: "/login" })),
      active: false,
    },
  ];

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t pb-[env(safe-area-inset-bottom)]"
        style={{ background: "#faf8f5", borderColor: "rgba(15,37,66,0.12)" }}
      >
        <div className="grid grid-cols-5 mx-auto max-w-2xl">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`mp-serif flex flex-col items-center justify-center gap-1 py-2.5 text-[13px] transition-colors ${
                  i > 0 ? "border-l border-[rgba(15,37,66,0.10)]" : ""
                } ${item.active ? "text-[#c8a253]" : "text-[#0f2542]"}`}
              >
                <Icon className="h-6 w-6" strokeWidth={1.4} />
                {item.label}
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

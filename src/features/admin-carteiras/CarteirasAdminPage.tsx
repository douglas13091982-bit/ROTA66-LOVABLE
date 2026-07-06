import { useState } from "react";
import { Bike, Store, Handshake, Coins, Wallet } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { SaquesEntregadoresPage } from "@/features/admin-saques-entregadores/SaquesEntregadoresPage";
import { AdminSaquesLojasPage } from "@/features/admin-saques-lojas/AdminSaquesLojasPage";
import { AdminSaquesRevendedoresPage } from "@/features/admin-saques-revendedores/AdminSaquesRevendedoresPage";
import { CreditosEntregadorPage } from "@/features/admin-creditos-entregador/CreditosEntregadorPage";

type TabKey = "saques-entregadores" | "saques-lojas" | "saques-revendedores" | "creditos-entregador";

const TABS: { key: TabKey; label: string; Icon: typeof Wallet }[] = [
  { key: "saques-entregadores", label: "Saques entregadores", Icon: Bike },
  { key: "saques-lojas", label: "Saques lojas", Icon: Store },
  { key: "saques-revendedores", label: "Saques revendedores", Icon: Handshake },
  { key: "creditos-entregador", label: "Créditos entregador", Icon: Coins },
];

/**
 * Renderiza o conteúdo da página sem o AdminShell externo,
 * para embutir dentro das abas de "Carteiras".
 */
function Bare({ children }: { children: React.ReactNode }) {
  return <div className="[&_.panel-premium]:contents [&_aside]:hidden [&_header]:hidden [&_main]:!p-0">{children}</div>;
}

export function CarteirasAdminPage() {
  const [tab, setTab] = useState<TabKey>("saques-entregadores");

  return (
    <AdminShell title="Carteiras & Saques">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition ${
                  active
                    ? "bg-gradient-red shadow-red text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-background"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        <Bare>
          {tab === "saques-entregadores" && <SaquesEntregadoresPage />}
          {tab === "saques-lojas" && <AdminSaquesLojasPage />}
          {tab === "saques-revendedores" && <AdminSaquesRevendedoresPage />}
          {tab === "creditos-entregador" && <CreditosEntregadorPage />}
        </Bare>
      </div>
    </AdminShell>
  );
}

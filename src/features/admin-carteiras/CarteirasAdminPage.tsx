import { useState } from "react";
import { Bike, Store, Handshake, Coins, Wallet } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { SaquesEntregadoresContent } from "@/features/admin-saques-entregadores/SaquesEntregadoresPage";
import { AdminSaquesLojasContent } from "@/features/admin-saques-lojas/AdminSaquesLojasPage";
import { AdminSaquesRevendedoresContent } from "@/features/admin-saques-revendedores/AdminSaquesRevendedoresPage";
import { CreditosEntregadorContent } from "@/features/admin-creditos-entregador/CreditosEntregadorPage";

type TabKey = "saques-entregadores" | "saques-lojas" | "saques-revendedores" | "creditos-entregador";

const TABS: { key: TabKey; label: string; Icon: typeof Wallet }[] = [
  { key: "saques-entregadores", label: "Saques entregadores", Icon: Bike },
  { key: "saques-lojas", label: "Saques lojas", Icon: Store },
  { key: "saques-revendedores", label: "Saques revendedores", Icon: Handshake },
  { key: "creditos-entregador", label: "Créditos entregador", Icon: Coins },
];

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

        <div>
          {tab === "saques-entregadores" && <SaquesEntregadoresContent />}
          {tab === "saques-lojas" && <AdminSaquesLojasContent />}
          {tab === "saques-revendedores" && <AdminSaquesRevendedoresContent />}
          {tab === "creditos-entregador" && <CreditosEntregadorContent />}
        </div>
      </div>
    </AdminShell>
  );
}

import { useState } from "react";
import { Bell, Bike, Store } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { ConfigForm } from "./components/ConfigForm";
import type { SomScope } from "@/lib/notificacao-som";

const TABS: { key: SomScope; label: string; Icon: typeof Bell; hint: string }[] = [
  {
    key: "push_entregador",
    label: "Push Entregador",
    Icon: Bell,
    hint: "Esse som toca no app do entregador APENAS quando uma Notificação Push (Notificação de sistema) é recebida com o app aberto.",
  },
  {
    key: "entregador",
    label: "Novo Pedido (App Aberto)",
    Icon: Bike,
    hint: "Esse som toca no app do entregador quando aparece um novo pedido disponível na lista e ele está com o app aberto.",
  },
  {
    key: "loja",
    label: "Loja",
    Icon: Store,
    hint: "Esse som toca no painel da loja (tela de Pedidos) quando um novo pedido entra — incluindo pedidos vindos do catálogo público.",
  },
];

export function SomAlertaAdminPage() {
  const [tab, setTab] = useState<SomScope>("push_entregador");
  const current = TABS.find((t) => t.key === tab)!;

  return (
    <AdminShell title="Sons de alerta">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl tracking-wide flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" />
            Sons de alerta
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{current.hint}</p>
        </div>

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

        <ConfigForm key={tab} scope={tab} />

        <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-md p-3">
          A nova configuração passa a valer assim que o {tab === "loja" ? "lojista" : "entregador"} recarregar a tela de pedidos.
        </div>
      </div>
    </AdminShell>
  );
}
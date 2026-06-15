import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { PageHeader } from "./components/PageHeader";
import { TabsNav } from "./components/TabsNav";
import { ConfigTab } from "./components/ConfigTab";
import { EntregadoresTab } from "./components/EntregadoresTab";
import { TransacoesTab } from "./components/TransacoesTab";
import type { TabKey } from "./logic/types";

export function CreditosEntregadorPage() {
  const [tab, setTab] = useState<TabKey>("config");

  return (
    <AdminShell title="Créditos do entregador">
      <PageHeader />
      <TabsNav tab={tab} onChange={setTab} />
      {tab === "config" && <ConfigTab />}
      {tab === "entregadores" && <EntregadoresTab />}
      {tab === "transacoes" && <TransacoesTab />}
    </AdminShell>
  );
}

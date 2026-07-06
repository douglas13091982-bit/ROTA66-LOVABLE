import { useState } from "react";
import { AdminShell } from "@/components/AdminShell";
import { PageHeader } from "./components/PageHeader";
import { TabsNav } from "./components/TabsNav";
import { ConfigTab } from "./components/ConfigTab";
import { EntregadoresTab } from "./components/EntregadoresTab";
import { TransacoesTab } from "./components/TransacoesTab";
import type { TabKey } from "./logic/types";

export function CreditosEntregadorContent() {
  const [tab, setTab] = useState<TabKey>("config");

  return (
    <>
      <PageHeader />
      <TabsNav tab={tab} onChange={setTab} />
      {tab === "config" && <ConfigTab />}
      {tab === "entregadores" && <EntregadoresTab />}
      {tab === "transacoes" && <TransacoesTab />}
    </>
  );
}

export function CreditosEntregadorPage() {
  return (
    <AdminShell title="Créditos do entregador">
      <CreditosEntregadorContent />
    </AdminShell>
  );
}

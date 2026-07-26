import { Component, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EntregadorCard } from "./EntregadorCard";
import type { EntregadorRow, StatusEntregador } from "../logic/types";

class CardBoundary extends Component<{ children: ReactNode }, { erro: boolean }> {
  state = { erro: false };
  static getDerivedStateFromError() {
    return { erro: true };
  }
  render() {
    if (this.state.erro) {
      return (
        <div className="bg-card border border-border rounded-lg p-5 text-sm text-muted-foreground">
          Não foi possível exibir este entregador.
        </div>
      );
    }
    return this.props.children;
  }
}

export type DocInfo = { status: string | null; tipo: string | null };

export function EntregadoresGrid({
  list,
  isLoading,
  onSetStatus,
  onRemove,
}: {
  list: EntregadorRow[];
  isLoading: boolean;
  onSetStatus: (id: string, status: StatusEntregador) => void;
  onRemove: (id: string, nome: string) => void;
}) {
  const [docs, setDocs] = useState<Record<string, DocInfo>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const ids = list.map((p) => p.id).join(",");

  // Uma única consulta para todos os cards (antes era 1 request por card,
  // o que travava a tela quando a lista era grande).
  useEffect(() => {
    if (!ids) {
      setDocs({});
      return;
    }
    let ativo = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("entregador_documentos")
        .select("entregador_id, status, tipo_veiculo")
        .in("entregador_id", ids.split(","));
      if (!ativo) return;
      const map: Record<string, DocInfo> = {};
      for (const d of data ?? []) {
        map[d.entregador_id] = { status: d.status ?? null, tipo: d.tipo_veiculo ?? null };
      }
      setDocs(map);
    })();
    return () => {
      ativo = false;
    };
  }, [ids, refreshKey]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((p) => (
        <CardBoundary key={p.id}>
          <EntregadorCard
            p={p}
            doc={docs[p.id] ?? null}
            onDocsChange={() => setRefreshKey((k) => k + 1)}
            onSetStatus={onSetStatus}
            onRemove={onRemove}
          />
        </CardBoundary>
      ))}
      {list.length === 0 && !isLoading && (
        <p className="col-span-full text-center text-muted-foreground py-8">
          Nenhum entregador no filtro.
        </p>
      )}
    </div>
  );
}

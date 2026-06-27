import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Download, Eye } from "lucide-react";
import { LojaShell } from "@/components/LojaShell";
import { useMinhaLoja } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, formatBRL } from "@/lib/format";
import { STATUS_LABEL, STATUS_COLOR } from "@/features/loja-pedidos/logic/constants";
import { PedidoDrawer } from "@/features/loja-pedidos/components/PedidoDrawer";
import { usePedidoActions } from "@/features/loja-pedidos/hooks/use-pedido-actions";
import type { Pedido } from "@/features/loja-pedidos/hooks/use-pedidos-loja";

type StatusFiltro = "todos" | "entregue" | "cancelado";

function isoDiasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function diasEntre(inicio: string, fim: string): { inicioIso: string; fimIso: string } {
  const ini = new Date(inicio);
  ini.setHours(0, 0, 0, 0);
  const fi = new Date(fim);
  fi.setHours(23, 59, 59, 999);
  return { inicioIso: ini.toISOString(), fimIso: fi.toISOString() };
}

function paraInputDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function exportarCsv(rows: Pedido[]) {
  const header = [
    "numero",
    "data",
    "status",
    "cliente",
    "telefone",
    "endereco",
    "produtos",
    "taxa_entrega",
    "total",
    "forma_pagamento",
    "entregador_id",
  ];
  const linhas = rows.map((p) => [
    p.numero,
    formatDateTime(p.created_at),
    STATUS_LABEL[p.status] ?? p.status,
    p.cliente_nome ?? "",
    p.cliente_telefone ?? "",
    p.endereco_entrega ?? "",
    Number(p.valor_produtos ?? 0).toFixed(2),
    Number(p.taxa_entrega ?? 0).toFixed(2),
    Number(p.valor_total ?? 0).toFixed(2),
    p.forma_pagamento ?? "",
    p.entregador_id ?? "",
  ]);
  const csv = [header, ...linhas]
    .map((cols) =>
      cols
        .map((c) => {
          const s = String(c ?? "");
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(";"),
    )
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historico-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function HistoricoPage() {
  const { data: loja } = useMinhaLoja();
  const [status, setStatus] = useState<StatusFiltro>("todos");
  const [dataInicio, setDataInicio] = useState<string>(paraInputDate(isoDiasAtras(30)));
  const [dataFim, setDataFim] = useState<string>(paraInputDate(new Date().toISOString()));
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState<Pedido | null>(null);

  const actions = usePedidoActions(loja?.id);

  const { data: pedidos, isLoading } = useQuery({
    queryKey: ["loja-historico", loja?.id, status, dataInicio, dataFim],
    enabled: !!loja?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const { inicioIso, fimIso } = diasEntre(dataInicio, dataFim);
      let q = supabase
        .from("pedidos")
        .select("*")
        .eq("loja_id", loja!.id)
        .in("status", status === "todos" ? ["entregue", "cancelado"] : [status])
        .gte("created_at", inicioIso)
        .lte("created_at", fimIso)
        .order("created_at", { ascending: false })
        .limit(500);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Pedido[];
    },
  });

  const filtrados = useMemo(() => {
    if (!pedidos) return [];
    const termo = busca.trim().toLowerCase();
    if (!termo) return pedidos;
    return pedidos.filter((p) => {
      return (
        String(p.numero ?? "").includes(termo) ||
        (p.cliente_nome ?? "").toLowerCase().includes(termo) ||
        (p.cliente_telefone ?? "").toLowerCase().includes(termo) ||
        (p.endereco_entrega ?? "").toLowerCase().includes(termo)
      );
    });
  }, [pedidos, busca]);

  const totais = useMemo(() => {
    let entregues = 0;
    let cancelados = 0;
    let receitaEntregue = 0;
    for (const p of filtrados) {
      if (p.status === "entregue") {
        entregues++;
        receitaEntregue += Number(p.valor_total ?? 0);
      } else if (p.status === "cancelado") {
        cancelados++;
      }
    }
    return { total: filtrados.length, entregues, cancelados, receitaEntregue };
  }, [filtrados]);

  if (!loja) {
    return (
      <LojaShell title="Histórico">
        <p className="text-muted-foreground">Crie sua loja primeiro no Dashboard.</p>
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Histórico">
      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wider text-white/60 mb-1">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            max={dataFim}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wider text-white/60 mb-1">Até</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            min={dataInicio}
            max={paraInputDate(new Date().toISOString())}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-[11px] uppercase tracking-wider text-white/60 mb-1">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFiltro)}
            className="bg-white/5 border border-white/10 rounded-md px-3 py-1.5 text-sm text-white"
          >
            <option value="todos">Todos finalizados</option>
            <option value="entregue">Entregues</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[200px]">
          <label className="text-[11px] uppercase tracking-wider text-white/60 mb-1">Buscar</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nº, cliente, telefone ou endereço"
              className="w-full bg-white/5 border border-white/10 rounded-md pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-white/30"
            />
          </div>
        </div>
        <button
          onClick={() => exportarCsv(filtrados)}
          disabled={filtrados.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" /> Exportar CSV
        </button>
      </div>

      {/* Resumo */}
      <div className="mb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <ResumoCard label="Total no período" value={String(totais.total)} />
        <ResumoCard label="Entregues" value={String(totais.entregues)} accent="text-emerald-400" />
        <ResumoCard label="Cancelados" value={String(totais.cancelados)} accent="text-zinc-400" />
        <ResumoCard
          label="Receita (entregues)"
          value={formatBRL(totais.receitaEntregue)}
          accent="text-white"
        />
      </div>

      {/* Lista */}
      {isLoading && <p className="text-muted-foreground">Carregando histórico...</p>}

      {!isLoading && filtrados.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="text-white/60 text-sm">Nenhum pedido encontrado no período selecionado.</p>
        </div>
      )}

      {!isLoading && filtrados.length > 0 && (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-white/60 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-3 py-2.5">Nº</th>
                  <th className="text-left px-3 py-2.5">Data</th>
                  <th className="text-left px-3 py-2.5">Cliente</th>
                  <th className="text-left px-3 py-2.5 hidden md:table-cell">Endereço</th>
                  <th className="text-right px-3 py-2.5">Total</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtrados.map((p) => (
                  <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-3 py-2.5 font-mono text-white/80">#{p.numero}</td>
                    <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">
                      {formatDateTime(p.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-white/80">
                      <div className="truncate max-w-[180px]">{p.cliente_nome ?? "—"}</div>
                      {p.cliente_telefone && (
                        <div className="text-[11px] text-white/40">{p.cliente_telefone}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-white/60 hidden md:table-cell">
                      <div className="truncate max-w-[260px]">{p.endereco_entrega ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-white">
                      {formatBRL(Number(p.valor_total ?? 0))}
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLOR[p.status] ?? "bg-white/10 text-white"}`}
                      >
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => setDetalhe(p)}
                        className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" /> Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PedidoDrawer
        detalhe={detalhe}
        lojaNome={loja.nome}
        actions={actions}
        onClose={() => setDetalhe(null)}
        onConfirmarColeta={() => {}}
        onUpdateDetalhe={setDetalhe}
      />
    </LojaShell>
  );
}

function ResumoCard({
  label,
  value,
  accent = "text-white",
}: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-white/50">{label}</div>
      <div className={`text-lg font-bold ${accent}`}>{value}</div>
    </div>
  );
}

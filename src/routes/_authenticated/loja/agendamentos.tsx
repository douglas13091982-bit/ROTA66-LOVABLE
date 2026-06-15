import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LojaShell } from "@/components/LojaShell";
import { AvatarImg } from "@/components/AvatarImg";
import { useMinhaLoja } from "@/hooks/use-loja";
import { supabase } from "@/integrations/supabase/client";
import {
  CalendarClock,
  Send,
  XCircle,
  Clock,
  User,
  Loader2,
  Trash2,
  Lock,
  CheckCircle2,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/loja/agendamentos")({
  component: AgendamentosPage,
});

type EntregadorAceito = {
  full_name: string | null;
  avatar_url: string | null;
  aceito_em: string;
};

type TurnoRow = {
  id: string;
  loja_id: string;
  entregador_id: string | null;
  data_turno: string;
  hora_inicio: string;
  duracao_horas: number;
  valor_por_hora: number;
  taxa_por_entrega: number;
  observacoes: string | null;
  status: "rascunho" | "publicado" | "aceito" | "concluido" | "cancelado";
  publicado_em: string | null;
  aceito_em: string | null;
  created_at: string;
  vagas_total: number;
  vagas_preenchidas: number;
  aceites: EntregadorAceito[];
};

const STATUS_LABEL: Record<TurnoRow["status"], { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "bg-zinc-700 text-zinc-100" },
  publicado: { label: "Aguardando entregador", color: "bg-amber-500/20 text-amber-300" },
  aceito: { label: "Aceito", color: "bg-emerald-500/20 text-emerald-300" },
  concluido: { label: "Concluído", color: "bg-blue-500/20 text-blue-300" },
  cancelado: { label: "Cancelado", color: "bg-red-500/20 text-red-300" },
};

function AgendamentosPage() {
  const { data: loja } = useMinhaLoja();
  const [turnos, setTurnos] = useState<TurnoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function carregar() {
    if (!loja?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("agendamentos" as never)
      .select("*")
      .eq("loja_id", loja.id)
      .order("data_turno", { ascending: false })
      .order("hora_inicio", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as TurnoRow[];
    rows.forEach((r) => { r.aceites = []; });
    if (rows.length > 0) {
      const { data: profs } = await (
        supabase.rpc as unknown as (
          f: string,
          a: { _loja_id: string },
        ) => Promise<{ data: { agendamento_id: string; entregador_id: string; full_name: string | null; avatar_url: string | null; aceito_em: string }[] | null }>
      )("get_entregadores_turnos_loja", { _loja_id: loja.id });
      const byTurno = new Map<string, EntregadorAceito[]>();
      (profs ?? []).forEach((p) => {
        const arr = byTurno.get(p.agendamento_id) ?? [];
        arr.push({ full_name: p.full_name, avatar_url: p.avatar_url, aceito_em: p.aceito_em });
        byTurno.set(p.agendamento_id, arr);
      });
      rows.forEach((r) => {
        r.aceites = byTurno.get(r.id) ?? [];
      });
    }
    setTurnos(rows);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja?.id]);

  useEffect(() => {
    if (!loja?.id) return;
    const ch = supabase
      .channel(`turnos-loja-${loja.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agendamentos", filter: `loja_id=eq.${loja.id}` },
        () => carregar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loja?.id]);

  if (!loja) {
    return (
      <LojaShell title="Turnos de entregador">
        <p className="text-muted-foreground">Crie sua loja primeiro.</p>
      </LojaShell>
    );
  }

  const planoMensal = !!(loja as { plano_mensal_ativo?: boolean }).plano_mensal_ativo;

  if (!planoMensal) {
    return (
      <LojaShell title="Turnos de entregador">
        <div className="max-w-2xl bg-card border border-border rounded-lg p-8 text-center shadow-card">
          <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-2xl mb-2">Recurso exclusivo do plano mensal</h2>
          <p className="text-muted-foreground text-sm">
            Os turnos de entregador estão disponíveis apenas para lojas com plano mensal ativo.
          </p>
        </div>
      </LojaShell>
    );
  }

  return (
    <LojaShell title="Turnos de entregador">
      <div className="space-y-4 max-w-7xl">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            Reserve entregadores para horários específicos oferecendo um valor por hora + uma taxa por cada
            entrega realizada no turno. A oportunidade vai para todos os entregadores externos e o primeiro a
            aceitar fica com o turno.
          </p>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-gradient-red text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-md shadow-red hover:opacity-90"
          >
            {showForm ? "Fechar formulário" : "+ Novo turno"}
          </button>
        </div>

        {showForm && (
          <NovoTurnoForm
            lojaId={loja.id}
            onCreated={() => {
              setShowForm(false);
              carregar();
            }}
          />
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : turnos.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-10 text-center shadow-card">
            <CalendarClock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum turno cadastrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {turnos.map((t) => (
              <TurnoCard key={t.id} t={t} onChange={carregar} />
            ))}
          </div>
        )}
      </div>
    </LojaShell>
  );
}

function TurnoCard({ t, onChange }: { t: TurnoRow; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const status = STATUS_LABEL[t.status];
  const data = new Date(`${t.data_turno}T${t.hora_inicio}`);
  const total = Number(t.valor_por_hora) * Number(t.duracao_horas);

  async function rpc(fn: string) {
    setBusy(true);
    const { error } = await (
      supabase.rpc as unknown as (
        f: string,
        a: { _agendamento_id: string },
      ) => Promise<{ error: { message: string } | null }>
    )(fn, { _agendamento_id: t.id });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return false;
    }
    return true;
  }

  async function publicar() {
    if (await rpc("publicar_turno")) {
      toast.success("Turno publicado! Os entregadores externos foram notificados.");
      onChange();
    }
  }

  async function cancelar() {
    if (!confirm("Cancelar este turno?")) return;
    if (await rpc("cancelar_turno")) {
      toast.success("Turno cancelado");
      onChange();
    }
  }

  async function concluir() {
    if (!confirm("Marcar este turno como concluído?")) return;
    if (await rpc("concluir_turno")) {
      toast.success("Turno concluído");
      onChange();
    }
  }

  async function excluir() {
    if (!confirm("Excluir este turno permanentemente?")) return;
    setBusy(true);
    const { error } = await supabase.from("agendamentos" as never).delete().eq("id", t.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno excluído");
    onChange();
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 md:p-5 shadow-card space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarClock className="h-5 w-5 text-primary" />
          <div>
            <div className="font-display text-lg leading-tight">
              {data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}
              {" · "}
              {t.hora_inicio.slice(0, 5)}
            </div>
            <div className="text-xs text-muted-foreground">
              Duração: {Number(t.duracao_horas)} h · {t.vagas_total} vaga{t.vagas_total > 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {t.vagas_total > 1 && (t.status === "publicado" || t.status === "aceito") && (
            <span className="px-2 py-1 rounded-md text-[11px] font-bold bg-primary/15 text-primary">
              {t.vagas_preenchidas}/{t.vagas_total}
            </span>
          )}
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${status.color}`}>
            {status.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div className="bg-background/50 border border-border/60 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Por hora</div>
          <div className="font-display text-lg">R$ {Number(t.valor_por_hora).toFixed(2)}</div>
        </div>
        <div className="bg-background/50 border border-border/60 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Por entrega</div>
          <div className="font-display text-lg">R$ {Number(t.taxa_por_entrega).toFixed(2)}</div>
        </div>
        <div className="bg-background/50 border border-border/60 rounded-md p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Garantido</div>
          <div className="font-display text-lg text-emerald-400">R$ {total.toFixed(2)}</div>
        </div>
      </div>

      {t.observacoes && (
        <div className="text-sm text-muted-foreground bg-background/40 border border-border/60 rounded-md p-3">
          {t.observacoes}
        </div>
      )}

      {(t.aceites?.length ?? 0) > 0 && (
        <div className="space-y-2 bg-emerald-500/5 border border-emerald-500/20 rounded-md p-3">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-emerald-300 font-bold">
            <span>Entregadores confirmados</span>
            <span>{t.vagas_preenchidas} / {t.vagas_total} vaga{t.vagas_total > 1 ? "s" : ""}</span>
          </div>
          <ul className="space-y-1.5">
            {t.aceites.map((a, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-emerald-200">
                {a.avatar_url ? (
                  <AvatarImg src={a.avatar_url} alt={a.full_name ?? ""} className="h-5 w-5 rounded-full object-cover border border-emerald-500/30" fallback={<User className="h-3.5 w-3.5" />} />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
                <span className="font-bold">{a.full_name ?? "Entregador"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {t.status === "publicado" && t.vagas_preenchidas < t.vagas_total && (
        <div className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 px-3 py-2 rounded-md">
          <Clock className="h-3.5 w-3.5" />
          Aguardando entregadores · {t.vagas_total - t.vagas_preenchidas} vaga{t.vagas_total - t.vagas_preenchidas > 1 ? "s" : ""} restante{t.vagas_total - t.vagas_preenchidas > 1 ? "s" : ""}
        </div>
      )}


      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        {t.status === "rascunho" && (
          <>
            <button
              onClick={publicar}
              disabled={busy}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="h-3.5 w-3.5" /> Publicar para entregadores
            </button>
            <button
              onClick={excluir}
              disabled={busy}
              className="px-3 py-1.5 bg-zinc-700 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-zinc-600 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </>
        )}
        {(t.status === "publicado" || t.status === "aceito") && (
          <button
            onClick={cancelar}
            disabled={busy}
            className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <XCircle className="h-3.5 w-3.5" /> Cancelar
          </button>
        )}
        {t.status === "aceito" && (
          <button
            onClick={concluir}
            disabled={busy}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold uppercase tracking-wider rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Marcar concluído
          </button>
        )}
        {(t.status === "concluido" || t.status === "cancelado") && (
          <button
            onClick={excluir}
            disabled={busy}
            className="px-3 py-1.5 bg-zinc-700 text-zinc-100 text-xs font-bold uppercase tracking-wider rounded-md hover:bg-zinc-600 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
        )}
      </div>
    </div>
  );
}

function NovoTurnoForm({ lojaId, onCreated }: { lojaId: string; onCreated: () => void }) {
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState("4");
  const [valorHora, setValorHora] = useState("");
  const [taxaEntrega, setTaxaEntrega] = useState("");
  const [vagas, setVagas] = useState("1");
  const [obs, setObs] = useState("");
  const [busy, setBusy] = useState(false);

  // mínimo: hoje
  const minDate = new Date().toISOString().slice(0, 10);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!data || !hora) {
      toast.error("Defina data e hora do turno");
      return;
    }
    const inicio = new Date(`${data}T${hora}`);
    if (inicio.getTime() < Date.now()) {
      toast.error("O turno deve começar no futuro");
      return;
    }
    const vh = Number(valorHora);
    if (!vh || vh <= 0) {
      toast.error("Defina um valor por hora");
      return;
    }
    const vg = Math.max(1, Math.min(50, Math.floor(Number(vagas) || 1)));
    setBusy(true);
    const { error } = await supabase.from("agendamentos" as never).insert({
      loja_id: lojaId,
      data_turno: data,
      hora_inicio: hora,
      duracao_horas: Number(duracao) || 1,
      valor_por_hora: vh,
      taxa_por_entrega: Number(taxaEntrega) || 0,
      vagas_total: vg,
      observacoes: obs.trim() || null,
      status: "rascunho",
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno criado! Clique em 'Publicar' para enviar aos entregadores.");
    onCreated();
  }

  const INPUT =
    "w-full px-3 py-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary";
  const LABEL = "block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-card space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={LABEL}>Data *</label>
          <input
            type="date"
            className={INPUT}
            required
            min={minDate}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>Hora de início *</label>
          <input
            type="time"
            className={INPUT}
            required
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>Duração (horas) *</label>
          <input
            type="number"
            className={INPUT}
            required
            min={1}
            max={24}
            step="0.5"
            value={duracao}
            onChange={(e) => setDuracao(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL}>Valor por hora (R$) *</label>
          <input
            type="number"
            className={INPUT}
            required
            min={0}
            step="0.01"
            placeholder="Ex: 25,00"
            value={valorHora}
            onChange={(e) => setValorHora(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL}>Taxa por entrega no turno (R$)</label>
          <input
            type="number"
            className={INPUT}
            min={0}
            step="0.01"
            placeholder="Ex: 3,00"
            value={taxaEntrega}
            onChange={(e) => setTaxaEntrega(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={LABEL}>Vagas (quantos entregadores) *</label>
        <input
          type="number"
          className={INPUT}
          required
          min={1}
          max={50}
          step="1"
          value={vagas}
          onChange={(e) => setVagas(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          A oportunidade fica disponível para todos os entregadores externos até preencher todas as vagas.
        </p>
      </div>

      <div>
        <label className={LABEL}>Observações para o entregador</label>
        <textarea
          className={INPUT + " min-h-[80px]"}
          maxLength={500}
          placeholder="Ex: levar mochila grande, uniforme preto, etc."
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>

      <div className="bg-background/40 border border-border/60 rounded-md p-3 text-xs text-muted-foreground flex items-start gap-2">
        <DollarSign className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <span>
          O entregador receberá <strong className="text-foreground">R$ {((Number(valorHora) || 0) * (Number(duracao) || 0)).toFixed(2)}</strong>{" "}
          garantidos pelas {duracao || 0}h, mais <strong className="text-foreground">R$ {(Number(taxaEntrega) || 0).toFixed(2)}</strong> por cada entrega
          realizada durante o turno.
        </span>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="w-full px-5 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
        Criar turno
      </button>
    </form>
  );
}

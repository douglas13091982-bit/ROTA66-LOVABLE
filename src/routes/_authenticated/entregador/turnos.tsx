import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EntregadorShell } from "@/components/EntregadorShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CalendarClock, Loader2, CheckCircle2, Clock, Store, MapPin, ExternalLink, X, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/entregador/turnos")({
  component: TurnosEntregadorPage,
});

type TurnoDisponivel = {
  agendamento_id: string;
  loja_id: string;
  loja_nome: string | null;
  data_turno: string;
  hora_inicio: string;
  duracao_horas: number;
  valor_por_hora: number;
  taxa_por_entrega: number;
  observacoes: string | null;
  expira_em: string;
  vagas_total: number;
  vagas_preenchidas: number;
};

type MeuTurno = {
  id: string;
  loja_id: string;
  data_turno: string;
  hora_inicio: string;
  duracao_horas: number;
  valor_por_hora: number;
  taxa_por_entrega: number;
  observacoes: string | null;
  status: string;
  vagas_total: number;
  vagas_preenchidas: number;
  lojas: {
    nome: string | null;
    endereco: string | null;
    endereco_lat: number | null;
    endereco_lng: number | null;
    telefone: string | null;
  } | null;
};

function TurnosEntregadorPage() {
  const { user } = useAuth();
  const [disponiveis, setDisponiveis] = useState<TurnoDisponivel[]>([]);
  const [meus, setMeus] = useState<MeuTurno[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [{ data: dispData, error: dispErr }, { data: meusData, error: meusErr }] = await Promise.all([
      (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: TurnoDisponivel[] | null; error: { message: string } | null }>
      )("listar_turnos_disponiveis_entregador"),
      (
        supabase.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: Array<{
          id: string; loja_id: string; data_turno: string; hora_inicio: string;
          duracao_horas: number; valor_por_hora: number; taxa_por_entrega: number;
          observacoes: string | null; status: string;
          vagas_total: number; vagas_preenchidas: number;
          loja_nome: string | null; loja_endereco: string | null;
          loja_endereco_lat: number | null; loja_endereco_lng: number | null;
          loja_telefone: string | null;
        }> | null; error: { message: string } | null }>
      )("listar_meus_turnos_entregador"),
    ]);
    if (dispErr) toast.error(dispErr.message);
    else setDisponiveis(dispData ?? []);
    if (meusErr) toast.error(meusErr.message);
    else setMeus(((meusData ?? []) as Array<{
      id: string; loja_id: string; data_turno: string; hora_inicio: string;
      duracao_horas: number; valor_por_hora: number; taxa_por_entrega: number;
      observacoes: string | null; status: string;
      vagas_total: number; vagas_preenchidas: number;
      loja_nome: string | null; loja_endereco: string | null;
      loja_endereco_lat: number | null; loja_endereco_lng: number | null;
      loja_telefone: string | null;
    }>).map((r) => ({
      id: r.id, loja_id: r.loja_id, data_turno: r.data_turno, hora_inicio: r.hora_inicio,
      duracao_horas: r.duracao_horas, valor_por_hora: r.valor_por_hora,
      taxa_por_entrega: r.taxa_por_entrega, observacoes: r.observacoes, status: r.status,
      vagas_total: r.vagas_total, vagas_preenchidas: r.vagas_preenchidas,
      lojas: {
        nome: r.loja_nome, endereco: r.loja_endereco,
        endereco_lat: r.loja_endereco_lat, endereco_lng: r.loja_endereco_lng,
        telefone: r.loja_telefone,
      },
    })));
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // Realtime: novas ofertas e mudanças de turno
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase
      .channel(`turnos-entregador-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agendamento_ofertas",
          filter: `entregador_id=eq.${user.id}`,
        },
        (payload) => {
          carregar();
          if (payload.eventType === "INSERT") {
            toast.success("🔔 Nova oportunidade de turno disponível!", { duration: 6000 });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "agendamentos" },
        () => carregar(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, carregar]);

  async function aceitar(id: string) {
    const { error } = await (
      supabase.rpc as unknown as (
        f: string,
        a: { _agendamento_id: string },
      ) => Promise<{ error: { message: string } | null }>
    )("aceitar_turno", { _agendamento_id: id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno aceito! Apareceu em 'Meus turnos'.");
    carregar();
  }

  return (
    <EntregadorShell title="Turnos">
      <div className="space-y-6 max-w-4xl">
        <section>
          <h2 className="font-display text-xl mb-3 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Oportunidades disponíveis
          </h2>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
            </div>
          ) : disponiveis.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center shadow-card">
              <p className="text-muted-foreground text-sm">
                Nenhum turno disponível no momento. Quando uma loja publicar, você verá aqui em tempo real.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {disponiveis.map((t) => (
                <TurnoDisponivelCard key={t.agendamento_id} t={t} onAceitar={() => aceitar(t.agendamento_id)} />
              ))}
            </div>
          )}
        </section>

        <MeusTurnosSection meus={meus} onReload={carregar} />
      </div>
    </EntregadorShell>
  );
}

function TurnoDisponivelCard({ t, onAceitar }: { t: TurnoDisponivel; onAceitar: () => void }) {
  const [busy, setBusy] = useState(false);
  const inicio = new Date(`${t.data_turno}T${t.hora_inicio}`);
  const garantido = Number(t.valor_por_hora) * Number(t.duracao_horas);

  async function clicar() {
    setBusy(true);
    await onAceitar();
    setBusy(false);
  }

  return (
    <div className="bg-card border border-primary/30 rounded-lg p-4 md:p-5 shadow-card space-y-3 hover:border-primary/60 transition-colors">
      <div className="flex justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Store className="h-3.5 w-3.5" /> {t.loja_nome ?? "Loja"}
          </div>
          <div className="font-display text-xl leading-tight">
            {inicio.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })} ·{" "}
            {t.hora_inicio.slice(0, 5)}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {Number(t.duracao_horas)}h de turno
            </span>
            {t.vagas_total > 1 && (
              <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold text-[10px] uppercase tracking-wider">
                {t.vagas_total - t.vagas_preenchidas} de {t.vagas_total} vagas
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Garantido</div>
          <div className="font-display text-2xl text-emerald-400">R$ {garantido.toFixed(2)}</div>
          <div className="text-[11px] text-muted-foreground">+ R$ {Number(t.taxa_por_entrega).toFixed(2)} / entrega</div>
        </div>
      </div>

      {t.observacoes && (
        <div className="text-sm text-muted-foreground bg-background/40 border border-border/60 rounded-md p-3">
          {t.observacoes}
        </div>
      )}

      <button
        onClick={clicar}
        disabled={busy}
        className="w-full px-4 py-3 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider text-sm rounded-md hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Aceitar turno
      </button>
    </div>
  );
}

const DOW_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const DOW_LONG = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function MeusTurnosSection({ meus, onReload }: { meus: MeuTurno[]; onReload: () => Promise<void> | void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  async function desmarcar(id: string) {
    setCancelando(true);
    const { error } = await (
      supabase.rpc as unknown as (
        f: string,
        a: { _agendamento_id: string },
      ) => Promise<{ error: { message: string } | null }>
    )("desmarcar_turno_entregador", { _agendamento_id: id });
    setCancelando(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Turno desmarcado");
    setExpandedId(null);
    await onReload();
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Semana começa em Segunda
  const weekStart = new Date(today);
  const day = weekStart.getDay(); // 0=dom
  const diffToMonday = day === 0 ? -6 : 1 - day;
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const turnosByDate = new Map<string, MeuTurno[]>();
  for (const m of meus) {
    const arr = turnosByDate.get(m.data_turno) ?? [];
    arr.push(m);
    turnosByDate.set(m.data_turno, arr);
  }

  const now = new Date();
  const weekEnd = new Date(weekDays[weekDays.length - 1]);
  weekEnd.setHours(23, 59, 59, 999);

  const futuros = meus
    .filter((m) => {
      // Aceita tanto 'aceito' (todas as vagas preenchidas) quanto 'publicado'
      // (ainda há vagas, mas o entregador já reservou a dele).
      if (m.status !== "aceito" && m.status !== "publicado") return false;
      const start = new Date(`${m.data_turno}T${m.hora_inicio}`);
      const end = new Date(start.getTime() + Number(m.duracao_horas) * 3600_000);
      // Mantém o turno em destaque enquanto ele estiver em andamento;
      // some apenas quando o horário de término já passou.
      return end >= now;
    })
    .sort(
      (a, b) =>
        new Date(`${a.data_turno}T${a.hora_inicio}`).getTime() -
        new Date(`${b.data_turno}T${b.hora_inicio}`).getTime(),
    );
  const proximo = futuros[0];

  // Agenda semanal: todos os turnos aceitos/agendados dentro da semana atual
  const restantes = meus
    .filter((m) => {
      if (m.status !== "aceito" && m.status !== "publicado") return false;
      const start = new Date(`${m.data_turno}T${m.hora_inicio}`);
      const end = new Date(start.getTime() + Number(m.duracao_horas) * 3600_000);
      return end >= now && start <= weekEnd;
    })
    .sort(
      (a, b) =>
        new Date(`${a.data_turno}T${a.hora_inicio}`).getTime() -
        new Date(`${b.data_turno}T${b.hora_inicio}`).getTime(),
    );

  const fmtKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const monthLabel = MONTH_NAMES[today.getMonth()].toUpperCase();

  function minutesUntil(date: Date) {
    return Math.round((date.getTime() - now.getTime()) / 60000);
  }
  function formatRelative(min: number) {
    if (min < 60) return `Em ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `Em ${h}h`;
    const d = Math.floor(h / 24);
    return `Em ${d}d`;
  }
  function endTime(m: MeuTurno) {
    const start = new Date(`${m.data_turno}T${m.hora_inicio}`);
    const end = new Date(start.getTime() + Number(m.duracao_horas) * 3600_000);
    return `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <section className="space-y-6">
      {/* Calendário semanal */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono">
            {monthLabel}
          </span>
          <span className="text-xs uppercase tracking-[0.2em] text-primary font-mono">Hoje</span>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {weekDays.map((d) => {
            const isToday = d.getTime() === today.getTime();
            const hasTurno = turnosByDate.has(fmtKey(d));
            return (
              <div
                key={d.toISOString()}
                className={`relative flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all ${
                  isToday
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                <span className="text-[10px] uppercase tracking-wider font-mono">
                  {DOW_SHORT[d.getDay()]}
                </span>
                <span className={`font-display text-xl leading-none mt-1 ${isToday ? "text-primary" : "text-foreground/80"}`}>
                  {d.getDate()}
                </span>
                {hasTurno && !isToday && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary/70" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-px bg-border/40" />

      {/* Próximo turno em destaque */}
      {proximo ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs uppercase tracking-[0.2em] text-primary font-mono">
              Próximo turno
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {formatRelative(minutesUntil(new Date(`${proximo.data_turno}T${proximo.hora_inicio}`)))}
            </span>
          </div>
          <div className="font-display text-5xl tracking-tight leading-none">
            {proximo.hora_inicio.slice(0, 5)}
            <span className="text-muted-foreground mx-2">—</span>
            {endTime(proximo)}
          </div>
          <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground">
            {proximo.lojas?.endereco || proximo.lojas?.nome ? (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {proximo.lojas?.nome ?? "Loja"}
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5" />
              R$ {(Number(proximo.valor_por_hora) * Number(proximo.duracao_horas)).toFixed(2).replace(".", ",")} Base
            </span>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">
          Nenhum turno agendado.
        </div>
      )}

      <div className="h-px bg-border/40" />

      {/* Agenda semanal */}
      <div>
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-mono mb-3">
          Agenda semanal
        </h3>
        {restantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem outros turnos esta semana.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {restantes.map((m) => {
              const d = new Date(`${m.data_turno}T${m.hora_inicio}`);
              const isOpen = expandedId === m.id;
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : m.id)}
                    className="w-full flex items-center justify-between py-3 group cursor-pointer transition-colors hover:bg-white/[0.02] -mx-2 px-2 rounded text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-base text-foreground">
                        {DOW_LONG[d.getDay()]}, {d.getDate()} {MONTH_NAMES[d.getMonth()].slice(0, 3)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                        {m.hora_inicio.slice(0, 5)} — {endTime(m)}
                      </div>
                    </div>
                    <span className={`transition-colors ${isOpen ? "text-primary rotate-90" : "text-muted-foreground/60 group-hover:text-primary"}`}>
                      ›
                    </span>
                  </button>
                  {isOpen && (
                    <TurnoInlineDetails
                      turno={m}
                      onDesmarcar={() => desmarcar(m.id)}
                      cancelando={cancelando}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function TurnoInlineDetails({
  turno,
  onDesmarcar,
  cancelando,
}: {
  turno: MeuTurno;
  onDesmarcar: () => void;
  cancelando: boolean;
}) {
  const d = new Date(`${turno.data_turno}T${turno.hora_inicio}`);
  const end = new Date(d.getTime() + Number(turno.duracao_horas) * 3600_000);
  const fmtHora = (x: Date) =>
    `${String(x.getHours()).padStart(2, "0")}:${String(x.getMinutes()).padStart(2, "0")}`;
  const loja = turno.lojas;
  const mapsUrl =
    loja?.endereco_lat && loja?.endereco_lng
      ? `https://www.google.com/maps/dir//${loja.endereco_lat},${loja.endereco_lng}`
      : loja?.endereco
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loja.endereco)}`
        : null;
  const telDigits = loja?.telefone?.replace(/\D/g, "") ?? "";

  return (
    <div className="pb-3 -mx-2 px-2 space-y-3 animate-in fade-in slide-in-from-top-1">
      <div className="h-px bg-border/40" />

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Store className="h-4 w-4 text-primary shrink-0" />
          <span className="font-bold">{loja?.nome ?? "Loja"}</span>
        </div>
        {loja?.endereco && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{loja.endereco}</span>
          </div>
        )}
        {loja?.telefone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <a href={`tel:${telDigits}`} className="hover:text-foreground transition-colors">
              {loja.telefone}
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-primary/15 border border-primary/30 rounded-md text-sm text-primary hover:bg-primary/25 transition-colors"
          >
            <MapPin className="h-4 w-4" />
            Maps
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
        {telDigits && (
          <a
            href={`https://wa.me/55${telDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-md text-sm text-emerald-400 hover:bg-emerald-500/25 transition-colors"
          >
            <Phone className="h-4 w-4" />
            WhatsApp
          </a>
        )}
      </div>

      {turno.observacoes && (
        <div className="text-sm text-muted-foreground bg-background/40 border border-border/60 rounded-md p-3">
          {turno.observacoes}
        </div>
      )}

      <button
        onClick={onDesmarcar}
        disabled={cancelando}
        className="w-full px-4 py-3 border border-destructive/60 text-white font-bold uppercase tracking-wider text-sm rounded-md hover:bg-destructive/20 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
      >
        {cancelando ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        Desmarcar agendamento
      </button>
    </div>
  );
}

import { CalendarClock, DollarSign, Loader2 } from "lucide-react";
import { useNovoTurno } from "../hooks/use-novo-turno";
import { INPUT_CLS, LABEL_CLS } from "../logic/constants";

export function NovoTurnoForm({
  lojaId,
  onCreated,
}: {
  lojaId: string;
  onCreated: () => void;
}) {
  const { fields, setters, busy, minDate, submit } = useNovoTurno(lojaId, onCreated);
  const { data, hora, duracao, valorHora, taxaEntrega, vagas, obs } = fields;
  const {
    setData,
    setHora,
    setDuracao,
    setValorHora,
    setTaxaEntrega,
    setVagas,
    setObs,
  } = setters;

  return (
    <form
      onSubmit={submit}
      className="bg-card border border-border rounded-lg p-5 md:p-6 shadow-card space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={LABEL_CLS}>Data *</label>
          <input
            type="date"
            className={INPUT_CLS}
            required
            min={minDate}
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Hora de início *</label>
          <input
            type="time"
            className={INPUT_CLS}
            required
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Duração (horas) *</label>
          <input
            type="number"
            className={INPUT_CLS}
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
          <label className={LABEL_CLS}>Valor por hora (R$) *</label>
          <input
            type="number"
            className={INPUT_CLS}
            required
            min={0}
            step="0.01"
            placeholder="Ex: 25,00"
            value={valorHora}
            onChange={(e) => setValorHora(e.target.value)}
          />
        </div>
        <div>
          <label className={LABEL_CLS}>Taxa por entrega no turno (R$)</label>
          <input
            type="number"
            className={INPUT_CLS}
            min={0}
            step="0.01"
            placeholder="Ex: 3,00"
            value={taxaEntrega}
            onChange={(e) => setTaxaEntrega(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={LABEL_CLS}>Vagas (quantos entregadores) *</label>
        <input
          type="number"
          className={INPUT_CLS}
          required
          min={1}
          max={50}
          step="1"
          value={vagas}
          onChange={(e) => setVagas(e.target.value)}
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          A oportunidade fica disponível para todos os entregadores externos até preencher todas as
          vagas.
        </p>
      </div>

      <div>
        <label className={LABEL_CLS}>Observações para o entregador</label>
        <textarea
          className={INPUT_CLS + " min-h-[80px]"}
          maxLength={500}
          placeholder="Ex: levar mochila grande, uniforme preto, etc."
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>

      <div className="bg-background/40 border border-border/60 rounded-md p-3 text-xs text-muted-foreground flex items-start gap-2">
        <DollarSign className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <span>
          O entregador receberá{" "}
          <strong className="text-foreground">
            R$ {((Number(valorHora) || 0) * (Number(duracao) || 0)).toFixed(2)}
          </strong>{" "}
          garantidos pelas {duracao || 0}h, mais{" "}
          <strong className="text-foreground">
            R$ {(Number(taxaEntrega) || 0).toFixed(2)}
          </strong>{" "}
          por cada entrega realizada durante o turno.
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

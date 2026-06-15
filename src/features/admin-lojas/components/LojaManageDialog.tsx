import { Check, Ban, Trash2, Save, Store, Settings } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLojaPlano } from "../hooks/use-loja-plano";
import { EntregadoresDaLoja } from "./EntregadoresDaLoja";
import { TarifasLoja } from "./TarifasLoja";

interface Props {
  loja: any;
  onSetStatus: (id: string, status: "aprovado" | "bloqueado") => void;
  onRemove: (id: string, nome: string) => void;
  onToggleCatalogo: (id: string, atual: boolean) => void;
  onChanged: () => void;
}

export function LojaManageDialog({
  loja: l,
  onSetStatus,
  onRemove,
  onToggleCatalogo,
  onChanged,
}: Props) {
  const {
    mensValor,
    setMensValor,
    diaVenc,
    setDiaVenc,
    savingM,
    salvarMensalidade,
    planoAtivo,
    savingPlano,
    togglePlano,
  } = useLojaPlano(l, onChanged);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition">
          <Settings className="h-3.5 w-3.5" /> Gerenciar
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-md bg-gradient-red shadow-red flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="truncate">{l.nome}</div>
              <div className="text-xs font-normal text-muted-foreground truncate">
                /{l.slug} • {l.cidade ?? "—"} • {l.telefone ?? "sem telefone"}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Status */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Status da loja
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onSetStatus(l.id, "aprovado")}
                disabled={l.status === "aprovado"}
                className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-green-600/20 text-green-500 hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="h-3.5 w-3.5" /> Aprovar
              </button>
              <button
                onClick={() => onSetStatus(l.id, "bloqueado")}
                disabled={l.status === "bloqueado"}
                className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Ban className="h-3.5 w-3.5" /> Bloquear
              </button>
              <button
                onClick={() => onRemove(l.id, l.nome)}
                className="flex items-center justify-center gap-1 px-2 py-2 text-xs font-bold uppercase rounded-md bg-red-600/20 text-red-400 hover:bg-red-600/30"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </section>

          {/* Catálogo */}
          <section className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Catálogo online
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {l.catalogo_ativo
                    ? `Ativo em /c/${l.catalogo_slug ?? l.slug}`
                    : "Desativado — loja não aparece no catálogo público"}
                </p>
              </div>
              <Toggle
                ativo={!!l.catalogo_ativo}
                onClick={() => onToggleCatalogo(l.id, !!l.catalogo_ativo)}
              />
            </div>
          </section>

          {/* Plano mensal */}
          <section className="border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Plano mensal
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {planoAtivo
                    ? "Isenta da taxa R$ de cada pedido · usa tarifas próprias"
                    : "Cobra taxa por pedido + tarifas globais"}
                </p>
              </div>
              <Toggle ativo={planoAtivo} disabled={savingPlano} onClick={togglePlano} />
            </div>
            {planoAtivo && <TarifasLoja lojaId={l.id} />}
          </section>

          {/* Mensalidade */}
          <section className="border-t border-border pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Mensalidade desta loja
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Valor (R$)</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="padrão"
                  value={mensValor}
                  onChange={(e) => setMensValor(e.target.value)}
                  className="mt-0.5 w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                />
              </label>
              <label className="block">
                <span className="text-[10px] text-muted-foreground">Vencimento (dia)</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  step="1"
                  placeholder="padrão"
                  value={diaVenc}
                  onChange={(e) => setDiaVenc(e.target.value)}
                  className="mt-0.5 w-full px-2 py-1.5 bg-background border border-border rounded text-sm"
                />
              </label>
            </div>
            <button
              onClick={salvarMensalidade}
              disabled={savingM}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-bold uppercase rounded-md bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40"
            >
              <Save className="h-3 w-3" />{" "}
              {savingM ? "Salvando..." : "Salvar mensalidade"}
            </button>
            <p className="text-[10px] text-muted-foreground mt-1">
              Em branco = usa o valor padrão global.
            </p>
          </section>

          {/* Entregadores */}
          <section className="border-t border-border pt-4">
            <EntregadoresDaLoja lojaId={l.id} alwaysOpen />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Toggle({
  ativo,
  onClick,
  disabled,
}: {
  ativo: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition shrink-0 ${
        ativo ? "bg-green-600" : "bg-zinc-600"
      } disabled:opacity-40`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          ativo ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

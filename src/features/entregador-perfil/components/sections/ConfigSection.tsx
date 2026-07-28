import { toast } from "sonner";
import { Check, Trash2, X } from "lucide-react";
import { SectionPanel } from "../ui-atoms";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useVinculosLoja } from "../../hooks/use-vinculos-loja";

type LojaVinc = {
  id?: string;
  loja_id: string;
  ativo: boolean;
  status?: "pendente" | "aceito" | "recusado";
  loja?: { id: string; nome: string | null } | undefined;
};

type Props = {
  aceitaExternos: boolean;
  savingExternos: boolean;
  onToggleExternos: (novo: boolean) => void;
  lojas: LojaVinc[] | undefined;
};

export function ConfigSection({
  aceitaExternos,
  savingExternos,
  onToggleExternos,
  lojas,
}: Props) {
  const { user } = useAuth();
  const { responder, excluir } = useVinculosLoja(user?.id);

  const push = usePushNotifications();
  const pushOn = push.state === "granted";
  const pushDisabled = push.busy || push.state === "loading" || push.state === "unsupported";

  const [diag, setDiag] = useState<string | null>(null);

  async function togglePush() {
    try {
      if (pushOn) {
        await push.disable();
        toast.success("Notificações desativadas");
      } else {
        await push.enable();
        toast.success("Notificações ativadas");
      }
    } catch (e: any) {
      toast.error(e?.message || "Falha ao alterar notificações", { duration: 8000 });
    }
  }

  async function rodarDiagnostico() {
    try {
      setDiag("Verificando...");
      setDiag(await push.diagnose());
    } catch (e: any) {
      setDiag(`Erro: ${e?.message ?? e}`);
    }
  }

  return (
    <SectionPanel>
      <div className="flex items-start justify-between gap-3 py-1">
        <div className="flex-1">
          <p className="text-[13.5px] font-semibold text-white">Entregador externo</p>
          <p className="text-[11.5px] text-white/55 mt-0.5 leading-snug">
            Receba pedidos de lojas sem entregador próprio online.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleExternos(!aceitaExternos)}
          disabled={savingExternos}
          aria-pressed={aceitaExternos}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            aceitaExternos ? "bg-emerald-500" : "bg-white/15"
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              aceitaExternos ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="flex items-start justify-between gap-3 py-3 mt-3 border-t border-white/8">
        <div className="flex-1">
          <p className="text-[13.5px] font-semibold text-white">Notificações push</p>
          <p className="text-[11.5px] text-white/55 mt-0.5 leading-snug">
            {push.state === "unsupported"
              ? "Este dispositivo não suporta notificações."
              : push.state === "denied"
              ? "Permissão negada. Ative manualmente nas configurações."
              : pushOn
              ? "Você receberá alertas de novos pedidos."
              : "Ative para receber alertas de novos pedidos."}
          </p>
        </div>
        <button
          type="button"
          onClick={togglePush}
          disabled={pushDisabled}
          aria-pressed={pushOn}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            pushOn ? "bg-emerald-500" : "bg-white/15"
          } disabled:opacity-50`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              pushOn ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className="pt-3 border-t border-white/8">
        <p className="text-[10px] uppercase tracking-[0.22em] text-white/45 font-bold mb-2">
          Lojas vinculadas
        </p>
        {!lojas || lojas.length === 0 ? (
          <p className="text-[12px] text-white/50">Nenhum vínculo ainda.</p>
        ) : (
          <ul className="space-y-2">
            {lojas.map((v) => {
              const status = v.status ?? "aceito";
              return (
                <li
                  key={v.loja_id}
                  className="rounded-xl bg-white/[0.03] border border-white/8 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="text-white/85 font-medium truncate">
                      {v.loja?.nome ?? "—"}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] rounded-full shrink-0 ${
                        status === "pendente"
                          ? "bg-amber-500/15 text-amber-400"
                          : status === "recusado"
                          ? "bg-red-500/15 text-red-400"
                          : v.ativo
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-white/8 text-white/50"
                      }`}
                    >
                      {status === "pendente"
                        ? "Convite"
                        : status === "recusado"
                        ? "Recusado"
                        : v.ativo
                        ? "Ativo"
                        : "Inativo"}
                    </span>
                  </div>

                  {v.id && (
                    <div className="mt-2 flex items-center gap-2">
                      {status !== "aceito" && (
                        <button
                          type="button"
                          onClick={() => responder(v.id!, "aceito")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                        >
                          <Check className="h-3.5 w-3.5" /> Aceitar
                        </button>
                      )}
                      {status !== "recusado" && (
                        <button
                          type="button"
                          onClick={() => responder(v.id!, "recusado")}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/8 text-white/70 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                        >
                          <X className="h-3.5 w-3.5" /> Recusar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Excluir o vínculo com ${v.loja?.nome ?? "esta loja"}?`))
                            excluir(v.id!);
                        }}
                        className="inline-flex items-center justify-center rounded-lg bg-red-500/12 text-red-400 px-2.5 py-1.5"
                        aria-label="Excluir vínculo"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

        )}
      </div>
    </SectionPanel>
  );
}

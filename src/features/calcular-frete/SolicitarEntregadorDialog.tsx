import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, Loader2, CheckCircle2, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";
import { criarPedidoAvulso } from "@/lib/frete.functions";
import { PagamentoMercadoPago } from "@/components/catalogo/PagamentoMercadoPago";

interface Props {
  open: boolean;
  onClose: () => void;
  taxaEstimada: number;
  coleta: { address: string; lat: number; lng: number };
  entrega: { address: string; lat: number; lng: number };
}

type Etapa = "dados" | "pagamento" | "sucesso";

interface Dados {
  nome: string;
  telefone: string;
  descricao: string;
  complemento: string;
  cpf: string;
  email: string;
}

const NAVY = "#0F2341";
const RED = "#D8232A";

export function SolicitarEntregadorDialog({ open, onClose, taxaEstimada, coleta, entrega }: Props) {
  const criar = useServerFn(criarPedidoAvulso);
  const [etapa, setEtapa] = useState<Etapa>("dados");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<Dados>({
    nome: "",
    telefone: "",
    descricao: "",
    complemento: "",
    cpf: "",
    email: "",
  });
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [valorReal, setValorReal] = useState<number>(taxaEstimada);
  const [pedido, setPedido] = useState<{ id: string; numero: number } | null>(null);

  if (!open) return null;

  const fechar = () => {
    setEtapa("dados");
    setErro(null);
    setPendenteId(null);
    setPedido(null);
    onClose();
  };

  const irParaPagamento = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!dados.nome.trim() || !dados.telefone.trim() || !dados.descricao.trim()) {
      setErro("Preencha nome, telefone e o que vai ser entregue.");
      return;
    }
    if (!dados.cpf.trim() || !dados.email.trim()) {
      setErro("CPF e e-mail são obrigatórios para o pagamento.");
      return;
    }
    setEnviando(true);
    try {
      const r = await criar({
        data: {
          cliente_nome: dados.nome.trim(),
          cliente_telefone: dados.telefone.trim(),
          descricao_item: dados.descricao.trim(),
          endereco_coleta: coleta.address,
          endereco_coleta_lat: coleta.lat,
          endereco_coleta_lng: coleta.lng,
          endereco_entrega: entrega.address,
          endereco_entrega_lat: entrega.lat,
          endereco_entrega_lng: entrega.lng,
          complemento: dados.complemento.trim() || null,
          observacoes: null,
        },
      });
      setPendenteId(r.pendente_id);
      setValorReal(r.valor_total);
      setEtapa("pagamento");
    } catch (err: any) {
      setErro(err?.message ?? "Falha ao registrar o pedido");
    } finally {
      setEnviando(false);
    }
  };

  const linkRastreio = pedido ? `${window.location.origin}/rastreio/${pedido.id}` : "";

  const copiarLink = async () => {
    if (!linkRastreio) return;
    try {
      await navigator.clipboard.writeText(linkRastreio);
      toast.success("Link copiado");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={fechar}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-extrabold text-lg tracking-wide" style={{ color: NAVY }}>
              {etapa === "sucesso" ? "PEDIDO CONFIRMADO" : "SOLICITAR ENTREGADOR"}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {etapa === "dados" && "Preencha os dados para pagar o frete"}
              {etapa === "pagamento" && "Pague via PIX para liberar o pedido"}
              {etapa === "sucesso" && "Compartilhe o rastreio com quem receberá"}
            </p>
          </div>
          <button
            onClick={fechar}
            className="text-slate-400 hover:text-slate-700 p-1 rounded"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {etapa === "dados" && (
            <form onSubmit={irParaPagamento} className="space-y-3">
              <Campo
                label="Seu nome"
                value={dados.nome}
                onChange={(v) => setDados({ ...dados, nome: v })}
                placeholder="Ex.: João Silva"
                maxLength={120}
              />
              <Campo
                label="WhatsApp com DDD"
                value={dados.telefone}
                onChange={(v) => setDados({ ...dados, telefone: v })}
                placeholder="47 99999-9999"
                maxLength={20}
              />
              <Campo
                label="O que vai ser entregue?"
                value={dados.descricao}
                onChange={(v) => setDados({ ...dados, descricao: v })}
                placeholder="Ex.: envelope, sacola de roupas, caixa pequena"
                maxLength={200}
              />
              <Campo
                label="Complemento / referência (opcional)"
                value={dados.complemento}
                onChange={(v) => setDados({ ...dados, complemento: v })}
                placeholder="Apto, bloco, ponto de referência"
                maxLength={200}
              />
              <div className="grid grid-cols-2 gap-2">
                <Campo
                  label="CPF do pagador"
                  value={dados.cpf}
                  onChange={(v) => setDados({ ...dados, cpf: v })}
                  placeholder="Só números"
                  maxLength={14}
                />
                <Campo
                  label="E-mail"
                  value={dados.email}
                  onChange={(v) => setDados({ ...dados, email: v })}
                  placeholder="voce@email.com"
                  maxLength={120}
                  type="email"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <Linha rot="Coleta" val={coleta.address} />
                <Linha rot="Entrega" val={entrega.address} />
                <div className="flex justify-between pt-2 border-t border-slate-200 mt-2 font-bold text-sm" style={{ color: NAVY }}>
                  <span>Total do frete</span>
                  <span style={{ color: RED }}>R$ {taxaEstimada.toFixed(2)}</span>
                </div>
              </div>

              {erro && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full py-3.5 rounded-xl font-bold uppercase text-sm tracking-wider text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: RED }}
              >
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {enviando ? "Preparando pagamento..." : `Ir para o PIX — R$ ${taxaEstimada.toFixed(2)}`}
              </button>
              <p className="text-[10px] text-slate-500 text-center leading-snug">
                O entregador só é chamado após a confirmação do pagamento.
              </p>
            </form>
          )}

          {etapa === "pagamento" && pendenteId && (
            <PagamentoMercadoPago
              pendenteId={pendenteId}
              valor={valorReal}
              metodo="pix_online"
              publicKey=""
              payerNome={dados.nome}
              payerEmail={dados.email}
              payerDoc={dados.cpf.replace(/\D/g, "")}
              onAprovado={(p) => {
                setPedido(p);
                setEtapa("sucesso");
              }}
            />
          )}

          {etapa === "sucesso" && pedido && (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <div>
                <p className="font-bold text-lg" style={{ color: NAVY }}>
                  Pedido #{pedido.numero} confirmado!
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Um entregador será chamado agora. Você pode acompanhar em tempo real:
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs break-all font-mono">
                {linkRastreio}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={copiarLink}
                  className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Copy className="h-4 w-4" /> Copiar
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(
                    `Acompanhe seu pedido em tempo real: ${linkRastreio}`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#25D366" }}
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
              <button
                onClick={fechar}
                className="w-full py-3 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold"
              >
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full mt-1 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-slate-500"
      />
    </label>
  );
}

function Linha({ rot, val }: { rot: string; val: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-500 shrink-0 w-16">{rot}</span>
      <span className="text-slate-800 break-words">{val}</span>
    </div>
  );
}

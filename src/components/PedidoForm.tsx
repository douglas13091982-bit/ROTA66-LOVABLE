import {
  Calculator,
  Info,
  MapPin,
  Package,
  Phone,
  Send,
  Trash2,
  User,
  FileText,
  CreditCard,
} from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import {
  usePedidoForm,
  type EnderecoColetaSalvo,
} from "@/hooks/use-pedido-form";
import {
  useClientesAutocomplete,
  type ClienteSugestao,
} from "@/hooks/use-clientes-autocomplete";

const INPUT_CLS =
  "w-full h-12 px-3.5 bg-background/60 border border-border rounded-xl text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary/50 transition";
const INPUT_ICON_CLS = INPUT_CLS + " pl-10";
const LABEL_CLS =
  "block text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-2";
const CARD_CLS = "rounded-2xl border border-border bg-card p-4 shadow-card";

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70">
      {children}
    </span>
  );
}

type Props = {
  lojaId: string;
  taxaBase: number;
  enderecoColetaPadrao?: string;
  enderecosColetaSalvos?: EnderecoColetaSalvo[];
  bonusPadrao?: number;
  onSuccess?: (numero: number) => void;
  /** true = cliente final (anon); false = loja registrando manualmente */
  asCliente?: boolean;
};

export function PedidoForm({
  lojaId,
  taxaBase,
  enderecoColetaPadrao = "",
  enderecosColetaSalvos = [],
  bonusPadrao = 0,
  onSuccess,
  asCliente = false,
}: Props) {
  const form = usePedidoForm({
    lojaId,
    taxaBase,
    enderecoColetaPadrao,
    enderecosColetaSalvos,
    asCliente,
    bonusPadrao,
    onSuccess,
  });

  const autocomplete = useClientesAutocomplete(lojaId, !asCliente);

  function aplicarSugestao(c: ClienteSugestao) {
    form.aplicarCliente(c);
    autocomplete.limpar();
  }

  return (
    <form onSubmit={form.handleSubmit} className="space-y-3 pb-28 md:pb-0">
      {/* Cliente */}
      <div className={CARD_CLS}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CampoComSugestoes
            label="Nome do cliente *"
            campo="nome"
            icon={<User className="h-4 w-4" />}
            placeholder="Digite o nome"
            value={form.nome}
            onChange={(v) => {
              form.setNome(v);
              autocomplete.setCampoAtivo("nome");
              autocomplete.buscar("nome", v);
            }}
            autocomplete={autocomplete}
            onAplicar={aplicarSugestao}
            maxLength={120}
          />
          <CampoComSugestoes
            label="Telefone *"
            campo="telefone"
            icon={<Phone className="h-4 w-4" />}
            placeholder="(00) 00000-0000"
            inputMode="tel"
            value={form.telefone}
            onChange={(v) => {
              form.setTelefone(v);
              autocomplete.setCampoAtivo("telefone");
              autocomplete.buscar("telefone", v);
            }}
            autocomplete={autocomplete}
            onAplicar={aplicarSugestao}
            maxLength={40}
          />
        </div>
      </div>

      {/* Coleta */}
      <div className={CARD_CLS}>
        <SecaoEnderecoColeta
          enderecosSalvos={enderecosColetaSalvos}
          selecionadoId={form.enderecoColetaId}
          onSelecionar={form.selecionarEnderecoSalvo}
          enderecoColeta={form.enderecoColeta}
          onChangeEnderecoColeta={(v) => {
            form.setEnderecoColeta(v);
            form.setColetaCoords({ lat: null, lng: null });
          }}
          onSelectPlaceColeta={(p) => {
            form.setEnderecoColeta(p.address);
            form.setColetaCoords({ lat: p.lat, lng: p.lng });
          }}
        />
      </div>

      {/* Entrega */}
      <div className={CARD_CLS}>
        <label className={LABEL_CLS}>Endereço de entrega *</label>
        <div className="relative">
          <FieldIcon>
            <MapPin className="h-4 w-4" />
          </FieldIcon>
          <AddressAutocomplete
            className={INPUT_ICON_CLS}
            value={form.endereco}
            onChange={(v) => {
              form.setEndereco(v);
              form.setEntregaCoords({ lat: null, lng: null });
            }}
            onSelectPlace={(p) => {
              form.setEndereco(p.address);
              form.setEntregaCoords({ lat: p.lat, lng: p.lng });
            }}
            required
            placeholder="Rua, número, bairro"
          />
        </div>
      </div>

      {/* Complemento */}
      <div className={CARD_CLS}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className={LABEL_CLS + " mb-0"}>Complemento / Referência</span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5" /> Opcional
          </span>
        </div>
        <div className="relative">
          <FieldIcon>
            <FileText className="h-4 w-4" />
          </FieldIcon>
          <input
            className={INPUT_ICON_CLS}
            placeholder="Ex.: Apartamento, portaria, ponto de referência..."
            value={form.complemento}
            onChange={(e) => form.setComplemento(e.target.value)}
            maxLength={200}
          />
        </div>
      </div>

      {/* Itens + iFood */}
      <div className={CARD_CLS}>
        <ItensSection
          itens={form.itens}
          onUpdate={form.updateItem}
          onAdd={form.addItem}
          onRemove={form.removeItem}
        />

        <label className="mt-3 flex items-start gap-3 p-3 rounded-xl border border-border bg-background/60 cursor-pointer hover:border-primary/50 transition">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-400" />
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-bold uppercase tracking-wider text-foreground">
              Pedido do iFood
            </div>
            <div className="text-muted-foreground mt-0.5">
              Marque se este pedido veio do iFood. O entregador finalizará a entrega
              pelo link oficial do iFood (sem código de 4 dígitos).
            </div>
          </div>
          <input
            type="checkbox"
            checked={form.origem === "ifood"}
            onChange={(e) =>
              form.setOrigem(e.target.checked ? "ifood" : "proprio")
            }
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
        </label>
      </div>

      {/* Pagamento + taxa */}
      <div className={CARD_CLS}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={LABEL_CLS}>Forma de pagamento</label>
            <div className="relative">
              <FieldIcon>
                <CreditCard className="h-4 w-4" />
              </FieldIcon>
              <select
                className={INPUT_ICON_CLS}
                value={form.formaPagamento}
                onChange={(e) =>
                  form.setFormaPagamento(
                    e.target.value as typeof form.formaPagamento,
                  )
                }
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
              </select>
            </div>
            {form.formaPagamento === "dinheiro" && (
              <div className="mt-3">
                <label className={LABEL_CLS}>Troco para (R$)</label>
                <input
                  className={INPUT_CLS}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={form.trocoPara}
                  onChange={(e) => form.setTrocoPara(e.target.value)}
                />
              </div>
            )}
          </div>
          <TaxaSection taxa={form.taxa} taxaInfo={form.taxaInfo} />
        </div>
      </div>

      {/* Bônus */}
      <div className={CARD_CLS}>
        <BonusSection bonus={form.bonus} setBonus={form.setBonus} />
      </div>

      {/* Observações */}
      <div className={CARD_CLS}>
        <label className={LABEL_CLS}>Observações</label>
        <textarea
          className={INPUT_CLS + " h-auto min-h-[88px] py-3"}
          placeholder="Alguma informação extra para o entregador?"
          value={form.observacoes}
          onChange={(e) => form.setObservacoes(e.target.value)}
          maxLength={500}
        />
      </div>

      <ResumoTotal
        valorProdutos={form.valorProdutos}
        taxaFinal={form.taxaFinal}
        valorTotal={form.valorTotal}
      />

      {/* Ação */}
      <div className="pb-[env(safe-area-inset-bottom)]">
        <button
          type="submit"
          disabled={form.loading}
          className="w-full h-14 px-5 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send className="h-5 w-5" />
          <span>{form.loading ? "Enviando..." : "Criar pedido"}</span>
          <span className="ml-1 font-display normal-case tracking-normal opacity-90">
            · R$ {form.valorTotal.toFixed(2)}
          </span>
        </button>
      </div>
    </form>
  );
}

function CampoComSugestoes({
  label,
  campo,
  value,
  onChange,
  autocomplete,
  onAplicar,
  maxLength,
  icon,
  placeholder,
  inputMode,
}: {
  label: string;
  campo: "nome" | "telefone";
  value: string;
  onChange: (v: string) => void;
  autocomplete: ReturnType<typeof useClientesAutocomplete>;
  onAplicar: (c: ClienteSugestao) => void;
  maxLength: number;
  icon?: React.ReactNode;
  placeholder?: string;
  inputMode?: "text" | "tel";
}) {
  const ativo = autocomplete.campoAtivo === campo;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const aberto = ativo && autocomplete.sugestoes.length > 0;

  useLayoutEffect(() => {
    if (!aberto) return;
    const atualizar = () => {
      const el = wrapRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    atualizar();
    window.addEventListener("scroll", atualizar, true);
    window.addEventListener("resize", atualizar);
    return () => {
      window.removeEventListener("scroll", atualizar, true);
      window.removeEventListener("resize", atualizar);
    };
  }, [aberto, autocomplete.sugestoes.length]);

  return (
    <div className="relative">
      <label className={LABEL_CLS}>{label}</label>
      <div className="relative" ref={wrapRef}>
        {icon && <FieldIcon>{icon}</FieldIcon>}
        <input
          className={icon ? INPUT_ICON_CLS : INPUT_CLS}
          value={value}
          placeholder={placeholder}
          inputMode={inputMode}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            autocomplete.setCampoAtivo(campo);
            autocomplete.buscar(campo, value);
          }}
          onBlur={() =>
            setTimeout(
              () => autocomplete.setCampoAtivo((c) => (c === campo ? null : c)),
              150,
            )
          }
          maxLength={maxLength}
          autoComplete="off"
          required
        />
      </div>
      {aberto &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <ul
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl ring-1 ring-black/20 max-h-64 overflow-auto"
          >
            {autocomplete.sugestoes.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onAplicar(c);
                  }}
                  className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm"
                >
                  <div className="font-medium truncate">{c.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.telefone}
                    {c.endereco ? ` · ${c.endereco}` : ""}
                  </div>
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

function SecaoEnderecoColeta({
  enderecosSalvos,
  selecionadoId,
  onSelecionar,
  enderecoColeta,
  onChangeEnderecoColeta,
  onSelectPlaceColeta,
}: {
  enderecosSalvos: EnderecoColetaSalvo[];
  selecionadoId: string;
  onSelecionar: (id: string) => void;
  enderecoColeta: string;
  onChangeEnderecoColeta: (v: string) => void;
  onSelectPlaceColeta: (p: {
    address: string;
    lat: number | null;
    lng: number | null;
  }) => void;
}) {
  const customMode = selecionadoId === "custom" || enderecosSalvos.length === 0;
  return (
    <div>
      <label className={LABEL_CLS}>Endereço de coleta *</label>
      {enderecosSalvos.length > 0 && (
        <div className="relative mb-2">
          <FieldIcon>
            <MapPin className="h-4 w-4" />
          </FieldIcon>
          <select
            className={INPUT_ICON_CLS}
            value={selecionadoId}
            onChange={(e) => onSelecionar(e.target.value)}
          >
            {enderecosSalvos.map((e) => (
              <option key={e.id} value={e.id}>
                {e.rotulo}
                {e.padrao ? " (padrão)" : ""} — {e.endereco.slice(0, 60)}
              </option>
            ))}
            <option value="custom">Outro endereço (digitar)</option>
          </select>
        </div>
      )}
      {customMode && (
        <div className="relative">
          <FieldIcon>
            <MapPin className="h-4 w-4" />
          </FieldIcon>
          <AddressAutocomplete
            className={INPUT_ICON_CLS}
            value={enderecoColeta}
            onChange={onChangeEnderecoColeta}
            onSelectPlace={onSelectPlaceColeta}
            required
            placeholder="De onde o entregador vai buscar"
          />
        </div>
      )}
    </div>
  );
}

function ItensSection({
  itens,
  onUpdate,
  onAdd,
  onRemove,
}: {
  itens: { nome: string; qtd: number; preco: number }[];
  onUpdate: (
    idx: number,
    patch: Partial<{ nome: string; qtd: number; preco: number }>,
  ) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className={LABEL_CLS + " mb-0"}>Itens do pedido</span>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 text-xs font-bold uppercase tracking-wider text-primary hover:underline"
        >
          + Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {itens.map((it, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-2 items-center sm:grid-cols-[minmax(0,1fr)_6rem_6rem_2.25rem]"
          >
            <div className="relative col-span-full min-w-0 sm:col-span-1">
              <FieldIcon>
                <Package className="h-4 w-4" />
              </FieldIcon>
              <input
                className={INPUT_ICON_CLS}
                placeholder="Descrição do item"
                value={it.nome}
                onChange={(e) => onUpdate(idx, { nome: e.target.value })}
                maxLength={120}
              />
            </div>

            <input
              className={INPUT_CLS + " text-center px-1"}
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="Qtd"
              value={it.qtd}
              onChange={(e) => onUpdate(idx, { qtd: Number(e.target.value) })}
            />
            <input
              className={INPUT_CLS + " px-2"}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              placeholder="Preço un."
              value={it.preco || ""}
              onChange={(e) => onUpdate(idx, { preco: Number(e.target.value) })}
            />
            <button
              type="button"
              onClick={() => onRemove(idx)}
              disabled={itens.length === 1}
              aria-label="Remover item"
              className="h-12 w-9 grid place-items-center text-muted-foreground hover:text-destructive disabled:opacity-30"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaxaSection({
  taxa,
  taxaInfo,
}: {
  taxa: number;
  taxaInfo: string | null;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={LABEL_CLS + " mb-0"}>Taxa de entrega (R$)</span>
        <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-taxa">
          <Calculator className="h-3 w-3" /> Automática
        </span>
      </div>
      <div className="flex items-baseline gap-1 rounded-xl border border-taxa/40 bg-taxa/10 px-4 py-3">
        <span className="text-base font-semibold text-taxa/80">R$</span>
        <span className="text-3xl font-extrabold tracking-tight text-taxa tabular-nums">
          {(Number(taxa) || 0).toFixed(2)}
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground mt-1.5">
        {taxaInfo
          ? `Calculada pelas tarifas do sistema · ${taxaInfo}`
          : "Selecione endereços no autocomplete para calcular automaticamente."}
      </p>
    </div>
  );
}

function BonusSection({
  bonus,
  setBonus,
}: {
  bonus: number;
  setBonus: (v: number) => void;
}) {
  const valores = Array.from({ length: 10 }, (_, i) => (i + 1) * 2);
  const btn = (ativo: boolean) =>
    `h-11 rounded-xl text-sm font-medium border transition ${
      ativo
        ? "bg-primary text-primary-foreground border-primary font-bold"
        : "border-border bg-background/60 text-foreground hover:border-primary/50"
    }`;
  return (
    <div>
      <label className={LABEL_CLS}>Bônus para o entregador</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button type="button" onClick={() => setBonus(0)} className={btn(bonus === 0)}>
          Sem bônus
        </button>
        {valores.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setBonus(v)}
            className={btn(bonus === v)}
          >
            +R$ {v},00
          </button>
        ))}
      </div>
    </div>
  );
}

function ResumoTotal({
  valorProdutos,
  taxaFinal,
  valorTotal,
}: {
  valorProdutos: number;
  taxaFinal: number;
  valorTotal: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-card p-4 space-y-1 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Produtos</span>
        <span>R$ {valorProdutos.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">Taxa de entrega</span>
        <span>R$ {taxaFinal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-display text-xl pt-2 border-t border-border">
        <span>Total</span>
        <span className="text-primary">R$ {valorTotal.toFixed(2)}</span>
      </div>
    </div>
  );
}

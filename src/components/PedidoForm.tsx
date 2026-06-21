import { Loader2, Calculator } from "lucide-react";
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
  "w-full px-3 py-2.5 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary";
const LABEL_CLS =
  "block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5";

type Props = {
  lojaId: string;
  taxaBase: number;
  enderecoColetaPadrao?: string;
  enderecosColetaSalvos?: EnderecoColetaSalvo[];
  onSuccess?: (numero: number) => void;
  /** true = cliente final (anon); false = loja registrando manualmente */
  asCliente?: boolean;
};

export function PedidoForm({
  lojaId,
  taxaBase,
  enderecoColetaPadrao = "",
  enderecosColetaSalvos = [],
  onSuccess,
  asCliente = false,
}: Props) {
  const form = usePedidoForm({
    lojaId,
    taxaBase,
    enderecoColetaPadrao,
    enderecosColetaSalvos,
    asCliente,
    onSuccess,
  });

  const autocomplete = useClientesAutocomplete(lojaId, !asCliente);

  function aplicarSugestao(c: ClienteSugestao) {
    form.aplicarCliente(c);
    autocomplete.limpar();
  }

  return (
    <form onSubmit={form.handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CampoComSugestoes
          label="Nome do cliente *"
          campo="nome"
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

      <div>
        <label className={LABEL_CLS}>Endereço de entrega *</label>
        <AddressAutocomplete
          className={INPUT_CLS}
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

      <div>
        <label className={LABEL_CLS}>Complemento / Referência</label>
        <input
          className={INPUT_CLS}
          value={form.complemento}
          onChange={(e) => form.setComplemento(e.target.value)}
          maxLength={200}
        />
      </div>

      <ItensSection
        itens={form.itens}
        onUpdate={form.updateItem}
        onAdd={form.addItem}
        onRemove={form.removeItem}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={LABEL_CLS}>Forma de pagamento</label>
          <select
            className={INPUT_CLS}
            value={form.formaPagamento}
            onChange={(e) =>
              form.setFormaPagamento(e.target.value as typeof form.formaPagamento)
            }
          >
            <option value="pix">PIX</option>
            <option value="cartao">Cartão</option>
          </select>
        </div>
        <TaxaSection
          taxa={form.taxa}
          taxaInfo={form.taxaInfo}
          bonus={form.bonus}
          setBonus={form.setBonus}
        />
      </div>

      {form.formaPagamento === "dinheiro" && (
        <div>
          <label className={LABEL_CLS}>Troco para (R$)</label>
          <input
            className={INPUT_CLS}
            type="number"
            min={0}
            step="0.01"
            value={form.trocoPara}
            onChange={(e) => form.setTrocoPara(e.target.value)}
          />
        </div>
      )}

      <div>
        <label className={LABEL_CLS}>Observações</label>
        <textarea
          className={INPUT_CLS + " min-h-[80px]"}
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

      <button
        type="submit"
        disabled={form.loading}
        className="w-full px-5 py-4 bg-gradient-red shadow-red text-primary-foreground font-bold uppercase tracking-wider rounded-md hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-between"
      >
        <span>{form.loading ? "Enviando..." : "Enviar pedido"}</span>
        <span className="font-display normal-case tracking-normal">
          Frete R$ {form.taxaFinal.toFixed(2)}
        </span>
      </button>
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
}: {
  label: string;
  campo: "nome" | "telefone";
  value: string;
  onChange: (v: string) => void;
  autocomplete: ReturnType<typeof useClientesAutocomplete>;
  onAplicar: (c: ClienteSugestao) => void;
  maxLength: number;
}) {
  const ativo = autocomplete.campoAtivo === campo;
  return (
    <div className="relative">
      <label className={LABEL_CLS}>{label}</label>
      <input
        className={INPUT_CLS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          autocomplete.setCampoAtivo(campo);
          autocomplete.buscar(campo, value);
        }}
        onBlur={() =>
          setTimeout(
            () =>
              autocomplete.setCampoAtivo((c) => (c === campo ? null : c)),
            150,
          )
        }
        maxLength={maxLength}
        autoComplete="off"
        required
      />
      {ativo && autocomplete.sugestoes.length > 0 && (
        <ul className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg max-h-64 overflow-auto">
          {autocomplete.sugestoes.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAplicar(c);
                }}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
              >
                <div className="font-medium">{c.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {c.telefone}
                  {c.endereco ? ` · ${c.endereco}` : ""}
                </div>
              </button>
            </li>
          ))}
        </ul>
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
  onSelectPlaceColeta: (p: { address: string; lat: number | null; lng: number | null }) => void;
}) {
  const customMode = selecionadoId === "custom" || enderecosSalvos.length === 0;
  return (
    <div>
      <label className={LABEL_CLS}>Endereço de coleta *</label>
      {enderecosSalvos.length > 0 && (
        <select
          className={INPUT_CLS + " mb-2"}
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
      )}
      {customMode && (
        <AddressAutocomplete
          className={INPUT_CLS}
          value={enderecoColeta}
          onChange={onChangeEnderecoColeta}
          onSelectPlace={onSelectPlaceColeta}
          required
          placeholder="De onde o entregador vai buscar"
        />
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
  onUpdate: (idx: number, patch: Partial<{ nome: string; qtd: number; preco: number }>) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className={LABEL_CLS + " mb-0"}>Itens do pedido</label>
        <button
          type="button"
          onClick={onAdd}
          className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
        >
          + Adicionar
        </button>
      </div>
      <div className="space-y-2">
        {itens.map((it, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2">
            <input
              className={INPUT_CLS + " col-span-6"}
              placeholder="Descrição do item"
              value={it.nome}
              onChange={(e) => onUpdate(idx, { nome: e.target.value })}
              maxLength={120}
            />
            <input
              className={INPUT_CLS + " col-span-2"}
              type="number"
              min={1}
              placeholder="Qtd"
              value={it.qtd}
              onChange={(e) => onUpdate(idx, { qtd: Number(e.target.value) })}
            />
            <input
              className={INPUT_CLS + " col-span-3"}
              type="number"
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
              className="col-span-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
            >
              ✕
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
  bonus,
  setBonus,
}: {
  taxa: number;
  taxaInfo: string | null;
  bonus: number;
  setBonus: (v: number) => void;
}) {
  const valores = Array.from({ length: 10 }, (_, i) => (i + 1) * 2);
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={LABEL_CLS + " mb-0"}>Taxa de entrega (R$)</label>
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <Calculator className="h-3 w-3" /> Automática
        </span>
      </div>
      <div className={INPUT_CLS + " opacity-90 flex items-center justify-between"}>
        <span>R$ {(Number(taxa) || 0).toFixed(2)}</span>
        {bonus > 0 && (
          <span className="text-xs text-primary">+ R$ {bonus.toFixed(2)} bônus</span>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {taxaInfo
          ? `Calculada pelas tarifas do sistema · ${taxaInfo}`
          : "Selecione endereços no autocomplete para calcular automaticamente."}
      </p>
      <div className="mt-2">
        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Bônus para o entregador
        </label>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          <button
            type="button"
            onClick={() => setBonus(0)}
            className={`px-2.5 py-1 rounded-md text-xs border transition ${
              bonus === 0
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            Sem bônus
          </button>
          {valores.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setBonus(v)}
              className={`px-2.5 py-1 rounded-md text-xs border transition ${
                bonus === v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              +R$ {v},00
            </button>
          ))}
        </div>
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
    <div className="bg-background border border-border rounded-md p-4 space-y-1 text-sm">
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

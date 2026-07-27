import { Bike, Calculator, Store } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Field } from "./Field";
import { inputCls } from "../logic/styles";
import { pagamentoOptions, type FormaPagamento } from "../logic/pagamento";

export type CheckoutForm = {
  cliente_nome: string;
  cliente_telefone: string;
  cliente_email: string;
  cliente_doc: string;
  endereco_entrega: string;
  complemento: string;
  observacoes: string;
  forma_pagamento: FormaPagamento;
  troco_para: string;
  tipo_entrega: "entrega" | "retirada";
};

type Props = {
  form: CheckoutForm;
  setForm: (next: CheckoutForm) => void;
  setEntregaCoords: (c: { lat: number | null; lng: number | null }) => void;
  temCoords: boolean;
  taxa: number;
  taxaInfo: string | null;
  mpAtivo: boolean;
  isOnline: boolean;
  retiradaDisponivel: boolean;
  enderecoLoja?: string | null;
  onSubmit: (e: React.FormEvent) => void;
};

export function CheckoutDados({
  form,
  setForm,
  setEntregaCoords,
  temCoords,
  taxa,
  taxaInfo,
  mpAtivo,
  isOnline,
  retiradaDisponivel,
  enderecoLoja,
  onSubmit,
}: Props) {
  const retirada = form.tipo_entrega === "retirada";
  return (
    <form id="checkout-form" onSubmit={onSubmit} className="space-y-3">
      {retiradaDisponivel && (
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Como você quer receber
          </span>
          <div className="grid grid-cols-2 gap-2 mt-1.5">
            {([
              { v: "entrega", l: "Entrega", Icon: Bike },
              { v: "retirada", l: "Retirar no balcão", Icon: Store },
            ] as const).map(({ v, l, Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setForm({ ...form, tipo_entrega: v })}
                className={`px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] rounded-xl border transition flex items-center justify-center gap-1.5 ${form.tipo_entrega === v ? "bg-foreground text-background border-foreground shadow-sm" : "bg-card border-border text-muted-foreground hover:border-foreground/30"}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {l}
              </button>
            ))}
          </div>
          {retirada && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Sem frete. Retire seu pedido em: {enderecoLoja || "endereço da loja"}
            </p>
          )}
        </div>
      )}
      <Field label="Seu nome" required>
        <input required maxLength={120} autoComplete="name" value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} className={inputCls} />
      </Field>
      <Field label="Telefone" required>
        <input required maxLength={20} inputMode="tel" autoComplete="tel" value={form.cliente_telefone} onChange={(e) => setForm({ ...form, cliente_telefone: e.target.value })} className={inputCls} />
      </Field>
      {!retirada && (
        <>
      <Field label="Endereço de entrega" required>
        <AddressAutocomplete
          className={inputCls}
          value={form.endereco_entrega}
          onChange={(v) => {
            setForm({ ...form, endereco_entrega: v });
            setEntregaCoords({ lat: null, lng: null });
          }}
          onSelectPlace={(p) => {
            setForm({ ...form, endereco_entrega: p.address });
            setEntregaCoords({ lat: p.lat, lng: p.lng });
          }}
          required
          placeholder="Rua, número, bairro"
        />
        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
          <Calculator className="h-3 w-3" />
          {temCoords
            ? `Frete calculado: R$ ${taxa.toFixed(2)}${taxaInfo ? ` · ${taxaInfo}` : ""}`
            : "Selecione um endereço na lista para calcular o frete automaticamente."}
        </p>
      </Field>
        </>
      )}
      {!retirada && (
        <Field label="Complemento">
          <input maxLength={200} value={form.complemento} onChange={(e) => setForm({ ...form, complemento: e.target.value })} className={inputCls} />
        </Field>
      )}
      <Field label="Observações">
        <textarea maxLength={500} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} className={inputCls} />
      </Field>

      <div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Forma de pagamento</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
          {pagamentoOptions(mpAtivo).map((opt) => (
            <button
              key={opt.v}
              type="button"
              onClick={() => setForm({ ...form, forma_pagamento: opt.v })}
              className={`px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] rounded-xl border transition ${form.forma_pagamento === opt.v ? "bg-foreground text-background border-foreground shadow-sm" : "bg-card border-border text-muted-foreground hover:border-foreground/30"}`}
            >
              {opt.l}
            </button>
          ))}
        </div>
      </div>
      {form.forma_pagamento === "dinheiro" && (
        <Field label="Troco para R$ (opcional)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.troco_para}
            onChange={(e) => setForm({ ...form, troco_para: e.target.value })}
            className={inputCls}
          />
        </Field>
      )}
      {isOnline && (
        <>
          <Field label="E-mail (para recibo)" required>
            <input required type="email" maxLength={120} value={form.cliente_email} onChange={(e) => setForm({ ...form, cliente_email: e.target.value })} className={inputCls} />
          </Field>
          <Field label="CPF/CNPJ" required>
            <input required inputMode="numeric" maxLength={18} value={form.cliente_doc} onChange={(e) => setForm({ ...form, cliente_doc: e.target.value })} className={inputCls} />
          </Field>
        </>
      )}
    </form>
  );
}

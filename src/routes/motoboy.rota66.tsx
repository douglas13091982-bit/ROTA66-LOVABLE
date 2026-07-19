import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2, MapPin, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { AddressAutocomplete, type AddressSelection } from "@/components/AddressAutocomplete";
import { PagamentoMercadoPago } from "@/components/catalogo/PagamentoMercadoPago";
import { supabase } from "@/integrations/supabase/client";
import {
  calcularFreteMotoboyAvulso,
  carregarLojaMotoboyAvulso,
  criarPendenteMotoboyAvulso,
} from "@/lib/motoboy-avulso.functions";

export const Route = createFileRoute("/motoboy/rota66")({
  component: MotoboyRota66Page,
  head: () => ({
    meta: [
      { title: "ROTA 66 · Motoboy Avulso" },
      { name: "description", content: "Solicite um motoboy da ROTA 66 direto — pague online e o entregador sai na hora." },
    ],
  }),
});

type Coords = { lat: number | null; lng: number | null };

function MotoboyRota66Page() {
  const carregar = useServerFn(carregarLojaMotoboyAvulso);
  const calcular = useServerFn(calcularFreteMotoboyAvulso);
  const criar = useServerFn(criarPendenteMotoboyAvulso);

  const [loja, setLoja] = useState<{ loja_id: string; nome: string } | null>(null);
  const [erroLoja, setErroLoja] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  const [clienteNome, setClienteNome] = useState("");
  const [clienteTel, setClienteTel] = useState("");
  const [clienteEmail, setClienteEmail] = useState("");
  const [clienteDoc, setClienteDoc] = useState("");

  const [destNome, setDestNome] = useState("");
  const [destTel, setDestTel] = useState("");

  const [coletaEnd, setColetaEnd] = useState("");
  const [coleta, setColeta] = useState<Coords>({ lat: null, lng: null });
  const [entregaEnd, setEntregaEnd] = useState("");
  const [entrega, setEntrega] = useState<Coords>({ lat: null, lng: null });
  const [complemento, setComplemento] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const [forma, setForma] = useState<"pix_online" | "cartao_online">("pix_online");

  const [taxa, setTaxa] = useState<{ km: number; frete: number; taxa_loja: number; taxa_entrega: number } | null>(null);

  const [enviando, setEnviando] = useState(false);
  const [pendente, setPendente] = useState<{ pendente_id: string; valor_total: number } | null>(null);
  const [sucessoNumero, setSucessoNumero] = useState<number | null>(null);

  useEffect(() => {
    carregar()
      .then((r) => setLoja(r))
      .catch((e) => setErroLoja(e?.message ?? "Falha ao carregar loja"));
  }, [carregar]);

  useEffect(() => {
    if (!loja) return;
    (async () => {
      const { data } = await (supabase as any).rpc("get_mp_public_config", { _loja_id: loja.loja_id });
      const row = data?.[0];
      if (row?.public_key) setPublicKey(row.public_key);
    })();
  }, [loja]);

  useEffect(() => {
    if (coleta.lat == null || coleta.lng == null || entrega.lat == null || entrega.lng == null) {
      setTaxa(null);
      return;
    }
    let cancelled = false;
    calcular({
      data: {
        coleta_lat: coleta.lat,
        coleta_lng: coleta.lng,
        entrega_lat: entrega.lat,
        entrega_lng: entrega.lng,
      },
    })
      .then((r) => {
        if (!cancelled) setTaxa(r);
      })
      .catch(() => {
        if (!cancelled) setTaxa(null);
      });
    return () => {
      cancelled = true;
    };
  }, [coleta.lat, coleta.lng, entrega.lat, entrega.lng, calcular]);

  const podeEnviar =
    !!loja &&
    !!publicKey &&
    clienteNome.trim().length >= 2 &&
    clienteTel.trim().length >= 8 &&
    /\S+@\S+\.\S+/.test(clienteEmail) &&
    clienteDoc.replace(/\D/g, "").length >= 11 &&
    destNome.trim().length >= 2 &&
    destTel.trim().length >= 8 &&
    coleta.lat != null &&
    coleta.lng != null &&
    entrega.lat != null &&
    entrega.lng != null &&
    !!taxa &&
    taxa.taxa_entrega > 0;

  async function handleContinuar() {
    if (!podeEnviar) return;
    setEnviando(true);
    try {
      const res = await criar({
        data: {
          cliente_nome: clienteNome.trim(),
          cliente_telefone: clienteTel.trim(),
          cliente_email: clienteEmail.trim(),
          cliente_doc: clienteDoc.trim(),
          destinatario_nome: destNome.trim(),
          destinatario_telefone: destTel.trim(),
          endereco_coleta: coletaEnd,
          endereco_coleta_lat: coleta.lat!,
          endereco_coleta_lng: coleta.lng!,
          endereco_entrega: entregaEnd,
          endereco_entrega_lat: entrega.lat!,
          endereco_entrega_lng: entrega.lng!,
          complemento: complemento || null,
          observacoes: observacoes || null,
          forma_pagamento: forma,
        },
      });
      setPendente({ pendente_id: res.pendente_id, valor_total: res.valor_total });
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao criar solicitação");
    } finally {
      setEnviando(false);
    }
  }

  if (erroLoja) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <p className="text-destructive font-bold">{erroLoja}</p>
        </div>
      </div>
    );
  }

  if (!loja) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (sucessoNumero !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center bg-card border border-border rounded-2xl p-8 shadow-card">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-3" />
          <h1 className="font-display text-2xl mb-1">Pedido enviado!</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Nº <span className="font-bold text-foreground">#{sucessoNumero}</span> — um motoboy da ROTA 66 já foi acionado.
          </p>
          <button
            type="button"
            onClick={() => {
              setSucessoNumero(null);
              setPendente(null);
              setDestNome("");
              setDestTel("");
              setColetaEnd("");
              setColeta({ lat: null, lng: null });
              setEntregaEnd("");
              setEntrega({ lat: null, lng: null });
              setComplemento("");
              setObservacoes("");
              setTaxa(null);
            }}
            className="px-6 py-3 bg-gradient-red shadow-red text-primary-foreground rounded-xl font-bold uppercase tracking-wider text-sm"
          >
            Nova corrida
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-red text-primary-foreground px-6 py-8 shadow-red">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <ShoppingBag className="h-8 w-8" />
          <div>
            <h1 className="font-display text-2xl leading-none">ROTA 66 · Motoboy Avulso</h1>
            <p className="text-sm opacity-90 mt-1">Peça um motoboy agora — pagamento online.</p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        {pendente && publicKey ? (
          <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card">
            <PagamentoMercadoPago
              pendenteId={pendente.pendente_id}
              valor={pendente.valor_total}
              metodo={forma}
              publicKey={publicKey}
              payerNome={clienteNome}
              payerEmail={clienteEmail}
              payerDoc={clienteDoc}
              onAprovado={(p) => setSucessoNumero(p.numero)}
              onTrocarParaPix={
                forma === "cartao_online"
                  ? () => {
                      setForma("pix_online");
                      setPendente(null);
                    }
                  : undefined
              }
            />
            <button
              type="button"
              onClick={() => setPendente(null)}
              className="mt-4 w-full text-xs text-muted-foreground underline"
            >
              Voltar e editar dados
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleContinuar();
            }}
            className="space-y-5 bg-card border border-border rounded-2xl p-5 md:p-6 shadow-card"
          >
            <Section title="Seus dados (pagador)">
              <Field label="Nome completo" value={clienteNome} onChange={setClienteNome} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Telefone" value={clienteTel} onChange={setClienteTel} inputMode="tel" />
                <Field label="CPF/CNPJ" value={clienteDoc} onChange={setClienteDoc} inputMode="numeric" />
              </div>
              <Field label="E-mail" value={clienteEmail} onChange={setClienteEmail} inputMode="text" />
            </Section>

            <Section title="Destinatário">
              <Field label="Nome do destinatário" value={destNome} onChange={setDestNome} />
              <Field label="Telefone do destinatário" value={destTel} onChange={setDestTel} inputMode="tel" />
            </Section>

            <Section title={<span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />Endereços</span>}>
              <AddressAutocomplete
                label="Endereço de coleta"
                required
                value={coletaEnd}
                onChange={setColetaEnd}
                onSelect={(s: AddressSelection) => {
                  setColetaEnd(s.endereco);
                  setColeta({ lat: s.lat ?? null, lng: s.lng ?? null });
                }}
                placeholder="Onde o motoboy vai buscar"
              />
              <AddressAutocomplete
                label="Endereço de entrega"
                required
                value={entregaEnd}
                onChange={setEntregaEnd}
                onSelect={(s: AddressSelection) => {
                  setEntregaEnd(s.address);
                  setEntrega({ lat: s.lat ?? null, lng: s.lng ?? null });
                }}
                placeholder="Onde entregar"
              />
              <Field label="Complemento (opcional)" value={complemento} onChange={setComplemento} />
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Observações (opcional)
                </span>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-xl text-[15px] focus:outline-none focus:border-primary"
                  placeholder="Ex: entregar em envelope, deixar na portaria..."
                />
              </label>
            </Section>

            <Section title="Pagamento">
              <div className="grid grid-cols-2 gap-2">
                <PagBtn active={forma === "pix_online"} onClick={() => setForma("pix_online")} label="PIX" />
                <PagBtn active={forma === "cartao_online"} onClick={() => setForma("cartao_online")} label="Cartão" />
              </div>
            </Section>

            <div className="rounded-xl border border-border bg-background/50 p-4 space-y-1 text-sm">
              {taxa ? (
                <>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Distância</span>
                    <span>{taxa.km.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-xs">
                    <span>Frete</span>
                    <span>R$ {taxa.frete.toFixed(2)}</span>
                  </div>
                  {taxa.taxa_loja > 0 && (
                    <div className="flex justify-between text-muted-foreground text-xs">
                      <span>Taxa de serviço</span>
                      <span>R$ {taxa.taxa_loja.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-1 border-t border-border mt-2">
                    <span>Total</span>
                    <span>R$ {taxa.taxa_entrega.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground text-center">
                  Preencha os endereços para calcular o valor.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!podeEnviar || enviando}
              className="w-full px-5 py-4 bg-gradient-red shadow-red text-primary-foreground rounded-xl font-bold uppercase text-sm tracking-wider hover:opacity-90 disabled:opacity-40"
            >
              {enviando ? "Processando..." : taxa ? `Pagar R$ ${taxa.taxa_entrega.toFixed(2)}` : "Continuar"}
            </button>
            <p className="text-[11px] text-center text-muted-foreground">
              O motoboy será acionado somente após a confirmação do pagamento.
            </p>
          </form>
        )}
      </main>
    </div>
  );
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-primary">{title}</h2>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "numeric" | "tel" | "text" | "decimal";
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode={inputMode}
        className="w-full mt-1 px-3 py-3 bg-background border border-border rounded-xl text-[15px] focus:outline-none focus:border-primary"
      />
    </label>
  );
}

function PagBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-3 rounded-xl border font-bold uppercase text-xs tracking-wider ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-border hover:border-primary"
      }`}
    >
      {label}
    </button>
  );
}

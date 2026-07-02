/**
 * Hook que orquestra TODO o estado e submit do formulário de pedido.
 * O componente fica responsável apenas por JSX.
 */

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveAddressToPlace } from "@/lib/google-maps-places";
import { useTarifaEntrega } from "./use-tarifa-entrega";

export type Item = { nome: string; qtd: number; preco: number };

export type EnderecoColetaSalvo = {
  id: string;
  rotulo: string;
  endereco: string;
  lat: number | null;
  lng: number | null;
  padrao: boolean;
};

type Coords = { lat: number | null; lng: number | null };
type FormaPagamento = "pix" | "dinheiro" | "cartao";

type Args = {
  lojaId: string;
  taxaBase: number;
  enderecoColetaPadrao: string;
  enderecosColetaSalvos: EnderecoColetaSalvo[];
  asCliente: boolean;
  onSuccess?: (numero: number) => void;
};

const LIMITES = {
  NOME: 120,
  TELEFONE: 40,
  ENDERECO: 300,
  COMPLEMENTO: 200,
  OBSERVACOES: 500,
} as const;

function enderecoInicialOf(enderecos: EnderecoColetaSalvo[]) {
  return enderecos.find((e) => e.padrao) ?? enderecos[0] ?? null;
}

function validar(args: {
  nome: string;
  telefone: string;
  enderecoColeta: string;
  endereco: string;
  itens: Item[];
}): string | null {
  if (
    !args.nome.trim() ||
    !args.telefone.trim() ||
    !args.enderecoColeta.trim() ||
    !args.endereco.trim()
  ) {
    return "Preencha nome, telefone, endereço de coleta e endereço de entrega";
  }
  const validItens = args.itens.filter((i) => i.nome.trim() && i.qtd > 0);
  if (validItens.length === 0) return "Adicione pelo menos um item";
  return null;
}

export function usePedidoForm({
  lojaId,
  taxaBase,
  enderecoColetaPadrao,
  enderecosColetaSalvos,
  asCliente,
  onSuccess,
}: Args) {
  const qc = useQueryClient();
  const enderecoInicial = enderecoInicialOf(enderecosColetaSalvos);

  const [enderecoColetaId, setEnderecoColetaId] = useState<string | "custom">(
    enderecoInicial ? enderecoInicial.id : "custom",
  );
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enderecoColeta, setEnderecoColeta] = useState(
    enderecoInicial?.endereco ?? enderecoColetaPadrao,
  );
  const [endereco, setEndereco] = useState("");
  const [complemento, setComplemento] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>("pix");
  const [trocoPara, setTrocoPara] = useState<string>("");
  const [itens, setItens] = useState<Item[]>([{ nome: "", qtd: 1, preco: 0 }]);
  const [loading, setLoading] = useState(false);
  const [bonus, setBonus] = useState<number>(0);
  const [coletaCoords, setColetaCoords] = useState<Coords>({
    lat: enderecoInicial?.lat ?? null,
    lng: enderecoInicial?.lng ?? null,
  });
  const [entregaCoords, setEntregaCoords] = useState<Coords>({ lat: null, lng: null });

  const { taxa, info: taxaInfo, setTaxa } = useTarifaEntrega(lojaId, coletaCoords, entregaCoords);

  // Inicializa com taxa base se a calculada ainda for 0
  const taxaBruta = taxa || Number(taxaBase) || 0;
  const taxaAtual = taxaBruta;
  const ehCartaoEntrega = false;
  const taxaFinal = taxaAtual;
  const bonusValor = Number(bonus) || 0;
  const valorProdutos = itens.reduce(
    (s, i) => s + (Number(i.qtd) || 0) * (Number(i.preco) || 0),
    0,
  );
  const valorTotal = valorProdutos + taxaFinal + bonusValor;



  const updateItem = (idx: number, patch: Partial<Item>) =>
    setItens((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setItens((arr) => [...arr, { nome: "", qtd: 1, preco: 0 }]);
  const removeItem = (idx: number) =>
    setItens((arr) => arr.filter((_, i) => i !== idx));

  function selecionarEnderecoSalvo(id: string) {
    setEnderecoColetaId(id);
    if (id === "custom") {
      setEnderecoColeta("");
      setColetaCoords({ lat: null, lng: null });
      return;
    }
    const sel = enderecosColetaSalvos.find((x) => x.id === id);
    if (sel) {
      setEnderecoColeta(sel.endereco);
      setColetaCoords({ lat: sel.lat, lng: sel.lng });
    }
  }

  async function aplicarCliente(c: {
    nome: string;
    telefone: string;
    endereco: string | null;
    complemento: string | null;
  }) {
    setNome(c.nome);
    setTelefone(c.telefone);
    if (c.endereco) {
      setEndereco(c.endereco);
      setEntregaCoords({ lat: null, lng: null });
      try {
        const place = await resolveAddressToPlace(c.endereco);
        setEndereco(place.address);
        setEntregaCoords({ lat: place.lat, lng: place.lng });
      } catch {
        toast.warning("Selecione o endereço no autocomplete para calcular a taxa automaticamente.");
      }
    }
    if (c.complemento) setComplemento(c.complemento);
  }

  function resetForm() {
    setNome("");
    setTelefone("");
    setEndereco("");
    setComplemento("");
    setObservacoes("");
    setItens([{ nome: "", qtd: 1, preco: 0 }]);
    setTrocoPara("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const erro = validar({ nome, telefone, enderecoColeta, endereco, itens });
    if (erro) {
      toast.error(erro);
      return;
    }

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const validItens = itens.filter((i) => i.nome.trim() && i.qtd > 0);

      const payload = {
        loja_id: lojaId,
        cliente_user_id: asCliente && userData.user ? userData.user.id : null,
        cliente_nome: nome.trim().slice(0, LIMITES.NOME),
        cliente_telefone: telefone.trim().slice(0, LIMITES.TELEFONE),
        endereco_coleta: enderecoColeta.trim().slice(0, LIMITES.ENDERECO),
        endereco_entrega: endereco.trim().slice(0, LIMITES.ENDERECO),
        complemento: complemento.trim().slice(0, LIMITES.COMPLEMENTO) || null,
        observacoes: observacoes.trim().slice(0, LIMITES.OBSERVACOES) || null,
        itens: validItens,
        valor_produtos: valorProdutos,
        taxa_entrega: taxaFinal,
        bonus_entregador: Number(bonus) || 0,
        valor_total: valorTotal,
        forma_pagamento: formaPagamento,
        troco_para:
          formaPagamento === "dinheiro" && trocoPara ? Number(trocoPara) : null,
        status: "em_preparo" as const,
        endereco_coleta_lat: coletaCoords.lat,
        endereco_coleta_lng: coletaCoords.lng,
        endereco_entrega_lat: entregaCoords.lat,
        endereco_entrega_lng: entregaCoords.lng,
      };

      const { data, error } = await supabase
        .from("pedidos")
        .insert(payload as never)
        .select("*, lojas:loja_id(taxa_por_pedido, plano_mensal_ativo)")
        .single();
      if (error) throw error;

      // Optimistic update: insere o pedido no cache antes do refetch/realtime,
      // para que apareça instantaneamente ao navegar para /loja/pedidos.
      const pedidoCache = {
        ...(data as any),
        loja_taxa_por_pedido: Number((data as any)?.lojas?.taxa_por_pedido ?? 0),
        loja_plano_mensal_ativo: Boolean((data as any)?.lojas?.plano_mensal_ativo),
      };
      qc.setQueryData(["pedidos", lojaId], (old: any[] | undefined) => {
        const lista = Array.isArray(old) ? old : [];
        if (lista.some((p) => p.id === pedidoCache.id)) return lista;
        return [pedidoCache, ...lista];
      });
      qc.invalidateQueries({ queryKey: ["pedidos", lojaId] });

      if (!asCliente) {
        await supabase.from("clientes_loja").upsert(
          {
            loja_id: lojaId,
            nome: payload.cliente_nome,
            telefone: payload.cliente_telefone,
            endereco: payload.endereco_entrega,
            complemento: payload.complemento,
          },
          { onConflict: "loja_id,telefone" },
        );
      }

      toast.success(`Pedido #${(data as any).numero} enviado!`);
      onSuccess?.((data as any).numero);
      resetForm();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao criar pedido";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return {
    // estado
    nome, setNome,
    telefone, setTelefone,
    enderecoColeta, setEnderecoColeta,
    endereco, setEndereco,
    complemento, setComplemento,
    observacoes, setObservacoes,
    formaPagamento, setFormaPagamento,
    trocoPara, setTrocoPara,
    itens,
    bonus, setBonus,
    coletaCoords, setColetaCoords,
    entregaCoords, setEntregaCoords,
    enderecoColetaId,
    // derivados
    taxa: taxaAtual,
    taxaBruta,
    ehCartaoEntrega,
    taxaInfo,
    setTaxa,
    taxaFinal,
    valorProdutos,
    valorTotal,
    loading,

    // ações
    updateItem,
    addItem,
    removeItem,
    selecionarEnderecoSalvo,
    aplicarCliente,
    handleSubmit,
  };
}

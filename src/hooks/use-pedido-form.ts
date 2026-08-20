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
import { convocarEntregadoresCidade, geocodificarEndereco } from "@/lib/frete.functions";


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
  bonusPadrao?: number;
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
  bonusPadrao = 0,
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
  const [bonus, setBonus] = useState<number>(Number(bonusPadrao) || 0);
  const [origem, setOrigem] = useState<"proprio" | "ifood">("proprio");
  const [coletaCoords, setColetaCoords] = useState<Coords>({
    lat: enderecoInicial?.lat ?? null,
    lng: enderecoInicial?.lng ?? null,
  });
  const [entregaCoords, setEntregaCoords] = useState<Coords>({ lat: null, lng: null });
  const [retornoMaquina, setRetornoMaquina] = useState(false);

  const { taxa, info: taxaInfo, setTaxa, adicionalRetorno } = useTarifaEntrega(
    lojaId,
    coletaCoords,
    entregaCoords,
    retornoMaquina,
  );

  // Inicializa com taxa base se a calculada ainda for 0
  const taxaBruta = taxa || Number(taxaBase) || 0;
  const taxaAtual = taxaBruta;
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

      // Snapshot da taxa do plano aplicada neste pedido — evita que o valor
      // exibido depois mude quando a loja trocar de plano.
      const { data: lojaSnap } = await supabase
        .from("lojas")
        .select("taxa_por_pedido, plano_mensal_ativo")
        .eq("id", lojaId)
        .maybeSingle();
      const taxaPlanoLoja = Number((lojaSnap as any)?.taxa_por_pedido ?? 0) || 0;
      const taxaPorPedidoAplicada = taxaPlanoLoja;

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
        retorno_maquina: retornoMaquina,
        adicional_retorno: Number(adicionalRetorno) || 0,
        taxa_por_pedido_aplicada: taxaPorPedidoAplicada,
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
        origem,
      };

      const { data, error } = await supabase
        .from("pedidos")
        .insert(payload as never)
        .select("*, lojas:loja_id(taxa_por_pedido, plano_mensal_ativo)")
        .single();
      if (error) throw error;

      // Convocação: se for o primeiro pedido do dia desta loja, o servidor
      // dispara push para os entregadores da cidade (valida e deduplica lá).
      void convocarEntregadoresCidade({
        data: { loja_id: lojaId, motivo: "primeiro_pedido" },
      }).catch((e: unknown) => console.error("[convocacao-primeiro-pedido] falhou", e));




      // Optimistic update: insere o pedido no cache antes do refetch/realtime,
      // para que apareça instantaneamente ao navegar para /loja/pedidos.
      const pedidoCache = {
        ...(data as any),
        loja_taxa_por_pedido:
          (data as any)?.taxa_por_pedido_aplicada != null
            ? Number((data as any).taxa_por_pedido_aplicada)
            : Number((data as any)?.lojas?.taxa_por_pedido ?? 0),
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
    origem, setOrigem,
    coletaCoords, setColetaCoords,
    entregaCoords, setEntregaCoords,
    enderecoColetaId,
    // derivados
    taxa: taxaAtual,
    taxaBruta,
    retornoMaquina, setRetornoMaquina,
    adicionalRetorno,

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

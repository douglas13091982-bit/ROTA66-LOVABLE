import { Package } from "lucide-react";

export function SemVinculoEstado() {
  return (
    <div className="bg-[#0d2c54] border border-[#0d2c54]/10 rounded-2xl p-12 text-center shadow-2xl">
      <div className="mx-auto mb-6 w-24 h-24 grid place-items-center bg-white/10 rounded-3xl">
        <Package className="h-12 w-12 text-white" />
      </div>
      <p className="text-white text-2xl font-black uppercase tracking-tight mb-3 leading-tight">
        Você ainda não está vinculado a nenhuma loja
      </p>
      <p className="text-white/70 text-sm mb-6 leading-relaxed">
        Peça à loja para te vincular como entregador no painel dela. Assim que vincular,
        os pedidos prontos aparecem aqui em tempo real.
      </p>
      <div className="bg-white/5 rounded-xl p-4 border border-white/10">
        <p className="text-white/80 text-xs leading-relaxed font-medium">
          DICA: Ative em <span className="text-white font-bold">Perfil</span> a opção{" "}
          <span className="italic">"Entregador externo"</span> para receber pedidos de lojas sem entregador próprio online.
        </p>
      </div>
    </div>
  );
}

import { createFileRoute } from '@tanstack/react-router';
import { EntregadorShell } from '@/components/EntregadorShell';
import { useAuth } from '@/hooks/use-auth';
import { usePerfilEntregador } from '@/features/entregador-perfil/hooks/use-perfil-entregador';
import { useLojasVinculo } from '@/features/entregador-perfil/hooks/use-perfil-stats';
import { ConfigSection } from '@/features/entregador-perfil/components/sections/ConfigSection';
import { SegurancaSection } from '@/features/entregador-perfil/components/sections/SegurancaSection';

export const Route = createFileRoute('/_authenticated/entregador/configuracoes')({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const { user } = useAuth();
  const perfil = usePerfilEntregador(user?.id);
  const { data: lojas } = useLojasVinculo(user?.id);

  return (
    <EntregadorShell title="Configurações">
      <div className="max-w-md mx-auto space-y-6 pb-20">
        <div className="bg-[#0d2c54] rounded-[22px] p-1 shadow-sm border border-navy/5 overflow-hidden">
          <div className="p-4 bg-[#0d2c54]">
             <h2 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-3">Ajustes do App</h2>
             <ConfigSection
               aceitaExternos={perfil.aceitaExternos}
               savingExternos={perfil.savingExternos}
               onToggleExternos={perfil.toggleExternos}
               lojas={lojas}
             />
          </div>
        </div>

        <div className="bg-[#0d2c54] rounded-[22px] p-1 shadow-sm border border-navy/5 overflow-hidden">
          <div className="p-4 bg-[#0d2c54]">
             <h2 className="text-white font-black uppercase tracking-[0.2em] text-[10px] mb-3">Segurança</h2>
             <SegurancaSection email={user?.email} />
          </div>
        </div>
        
        <div className="bg-white rounded-[22px] p-6 shadow-sm border border-navy/5">
          <h2 className="text-[#0d2c54] font-black uppercase tracking-[0.2em] text-[10px] mb-4">Sobre o App</h2>
          <div className="space-y-3 text-[13px] text-[#0d2c54]/70">
            <div className="flex justify-between items-center py-2 border-b border-navy/5">
              <span className="font-medium">Versão</span>
              <span className="font-bold text-[#0d2c54]">2.4.0</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium">Build</span>
              <span className="font-bold text-[#0d2c54]">20260805.1</span>
            </div>
          </div>
        </div>
      </div>
    </EntregadorShell>
  );
}


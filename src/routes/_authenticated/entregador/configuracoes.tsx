import { createFileRoute } from '@tanstack/react-router';
import { EntregadorShell } from '@/components/EntregadorShell';
import { PerfilForm } from '@/features/entregador-perfil/components/PerfilForm';

export const Route = createFileRoute('/_authenticated/entregador/configuracoes')({
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  return (
    <EntregadorShell title="Configurações">
      <div className="space-y-6">
        <div className="bg-white rounded-[22px] p-6 shadow-sm border border-navy/5">
          <h2 className="text-navy font-black uppercase tracking-widest text-xs mb-4">Preferências do App</h2>
          <PerfilForm />
        </div>
        
        <div className="bg-white rounded-[22px] p-6 shadow-sm border border-navy/5">
          <h2 className="text-navy font-black uppercase tracking-widest text-xs mb-4">Sobre o App</h2>
          <div className="space-y-2 text-sm text-navy/60">
            <div className="flex justify-between">
              <span>Versão</span>
              <span className="font-bold">2.4.0</span>
            </div>
            <div className="flex justify-between">
              <span>Build</span>
              <span className="font-bold">20260805</span>
            </div>
          </div>
        </div>
      </div>
    </EntregadorShell>
  );
}

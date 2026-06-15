import { SectionPanel } from "../ui-atoms";

type Props = {
  suporteWhatsapp: string | null | undefined;
  suporteHorario: string | null | undefined;
};

export function AjudaSection({ suporteWhatsapp, suporteHorario }: Props) {
  return (
    <SectionPanel>
      {suporteWhatsapp ? (
        <a
          href={`https://wa.me/${suporteWhatsapp.replace(/\D/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-4 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.18em] bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08]"
        >
          Falar com o suporte
        </a>
      ) : (
        <p className="text-[12px] text-white/55 text-center px-2 py-3">
          Canal de suporte ainda não configurado. Aguarde ou contate o administrador.
        </p>
      )}
      {suporteHorario && (
        <p className="text-[11px] text-white/45 text-center">{suporteHorario}</p>
      )}
    </SectionPanel>
  );
}

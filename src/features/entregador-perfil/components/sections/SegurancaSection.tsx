import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SectionPanel } from "../ui-atoms";

export function SegurancaSection({ email }: { email: string | null | undefined }) {
  return (
    <SectionPanel>
      <p className="text-[13px] text-white/65 leading-relaxed">
        Para trocar sua senha, use a opção <strong>"Esqueci minha senha"</strong> na tela de
        login.
      </p>
      <button
        type="button"
        onClick={async () => {
          if (!email) return;
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          if (error) toast.error(error.message);
          else toast.success("Enviamos um link de redefinição para seu e-mail.");
        }}
        className="w-full px-4 py-3 rounded-xl text-[12px] font-bold uppercase tracking-[0.18em] bg-white/[0.05] border border-white/10 text-white hover:bg-white/[0.08] transition-colors"
      >
        Enviar link de redefinição
      </button>
    </SectionPanel>
  );
}

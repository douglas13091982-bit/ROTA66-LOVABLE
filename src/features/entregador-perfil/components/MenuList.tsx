import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  Receipt,
  Settings,
  Shield,
  Store,
  User,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";
import type { MenuKey, SectionKey } from "../logic/types";

type Item = { key: MenuKey; icon: typeof User; label: string; to?: string };

const ITEMS: Item[] = [
  { key: "info", icon: User, label: "Informações Pessoais" },
  { key: "documentos", icon: FileText, label: "Meus documentos", to: "/entregador/documentos" },
  { key: "carteira", icon: Wallet, label: "Carteira", to: "/entregador/carteira" },
  { key: "mensalidade", icon: Receipt, label: "Cobrança de mensalidade", to: "/entregador/mensalidade" },
  { key: "pagamentos", icon: CreditCard, label: "Chave Pix" },
  { key: "indicacao", icon: Store, label: "Indicar uma loja" },
  { key: "seguranca", icon: Shield, label: "Segurança e Senha" },
  { key: "ajuda", icon: HelpCircle, label: "Central de Ajuda" },
  { key: "config", icon: Settings, label: "Configurações do App" },
];

const ROW_CLS =
  "w-full flex items-center gap-4 px-4 py-4 text-left rounded-2xl border border-white/10 bg-white/[0.03] active:bg-white/[0.06] transition-colors";

type Props = {
  openSection: SectionKey;
  setOpenSection: (s: SectionKey) => void;
  renderSection: (key: Exclude<MenuKey, "carteira" | "mensalidade">) => ReactNode;
};

export function MenuList({ openSection, setOpenSection, renderSection }: Props) {
  return (
    <div className="mt-5 space-y-2.5">
      <p className="text-[15px] text-white/40 px-1 pb-0.5">Conta</p>
      {ITEMS.map((m) => {
        const Icon = m.icon;
        const isOpen = openSection === m.key;
        const isLink = !!m.to;
        return (
          <div key={m.key}>
            {isLink ? (
              <Link to={m.to!} className={ROW_CLS}>
                <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} style={{ color: "#E01818" }} />
                <span className="flex-1 text-[17px] text-white">{m.label}</span>
                <ChevronRight className="h-5 w-5 text-white/45" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : (m.key as SectionKey))}
                className={ROW_CLS}
              >
                <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={2} style={{ color: "#E01818" }} />
                <span className="flex-1 text-[17px] text-white">{m.label}</span>
                <ChevronRight
                  className={`h-5 w-5 text-white/45 transition-transform ${isOpen ? "rotate-90" : ""}`}
                />
              </button>
            )}
            {isOpen && !isLink && (
              <div className="px-1 pt-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {renderSection(m.key as Exclude<MenuKey, "carteira" | "mensalidade">)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

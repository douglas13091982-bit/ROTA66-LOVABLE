import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  CreditCard,
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
  { key: "carteira", icon: Wallet, label: "Carteira", to: "/entregador/carteira" },
  { key: "mensalidade", icon: Receipt, label: "Cobrança de mensalidade", to: "/entregador/mensalidade" },
  { key: "pagamentos", icon: CreditCard, label: "Chave Pix" },
  { key: "indicacao", icon: Store, label: "Indicar uma loja" },
  { key: "seguranca", icon: Shield, label: "Segurança e Senha" },
  { key: "ajuda", icon: HelpCircle, label: "Central de Ajuda" },
  { key: "config", icon: Settings, label: "Configurações do App" },
];

type Props = {
  openSection: SectionKey;
  setOpenSection: (s: SectionKey) => void;
  renderSection: (key: Exclude<MenuKey, "carteira" | "mensalidade">) => ReactNode;
};

export function MenuList({ openSection, setOpenSection, renderSection }: Props) {
  return (
    <div className="mt-2">
      {ITEMS.map((m, idx) => {
        const Icon = m.icon;
        const isOpen = openSection === m.key;
        const isLink = !!m.to;
        return (
          <div key={m.key} className={idx > 0 ? "border-t border-white/8" : ""}>
            {isLink ? (
              <Link
                to={m.to!}
                className="w-full flex items-center gap-4 px-2 py-4 text-left active:bg-white/[0.03] transition-colors"
              >
                <Icon className="h-5 w-5 text-white/70 shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-[15px] font-semibold text-white">{m.label}</span>
                <ChevronRight className="h-4 w-4 text-white/40" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setOpenSection(isOpen ? null : (m.key as SectionKey))}
                className="w-full flex items-center gap-4 px-2 py-4 text-left active:bg-white/[0.03] transition-colors"
              >
                <Icon className="h-5 w-5 text-white/70 shrink-0" strokeWidth={1.8} />
                <span className="flex-1 text-[15px] font-semibold text-white">{m.label}</span>
                <ChevronRight
                  className={`h-4 w-4 text-white/40 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                />
              </button>
            )}
            {isOpen && !isLink && (
              <div className="px-2 pb-5 -mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                {renderSection(m.key as Exclude<MenuKey, "carteira" | "mensalidade">)}
              </div>
            )}
          </div>
        );
      })}
      <div className="border-t border-white/8" />
    </div>
  );
}

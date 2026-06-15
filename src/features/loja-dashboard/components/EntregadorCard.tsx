import { Bike, Circle, MapPin, Phone } from "lucide-react";
import type { EntregadorItem } from "../logic/types";

export function EntregadorCard({ e }: { e: EntregadorItem }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3.5 py-3 border transition-all duration-300 ${
        e.online
          ? "bg-emerald-500/[0.06] border-emerald-500/25 hover:border-emerald-500/40"
          : "bg-white/[0.02] border-white/5 hover:border-white/10"
      }`}
    >
      <div className="relative shrink-0">
        <div
          className="h-10 w-10 rounded-full grid place-items-center text-white"
          style={{
            background: "linear-gradient(135deg, oklch(0.62 0.22 27), oklch(0.42 0.20 27))",
          }}
        >
          <Bike className="h-5 w-5" />
        </div>
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-[oklch(0.16_0.015_260)] ${
            e.online ? "pp-dot-online" : "pp-dot-offline"
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[13.5px] text-white truncate tracking-tight">
          {e.full_name ?? "Entregador"}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-white/55 mt-0.5">
          <span
            className={`inline-flex items-center gap-1 ${e.online ? "text-emerald-400" : ""}`}
          >
            <Circle
              className={`h-2 w-2 fill-current ${e.online ? "text-emerald-400" : "text-white/30"}`}
            />
            {e.online ? "Online" : "Offline"}
          </span>
          {e.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-2.5 w-2.5" />
              {e.phone}
            </span>
          )}
        </div>
        {e.online && e.lat != null && e.lng != null && (
          <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            GPS ativo
          </div>
        )}
      </div>
    </div>
  );
}

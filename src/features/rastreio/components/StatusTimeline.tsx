import { STATUS_STEPS } from "../logic/types";

export function StatusTimeline({
  status,
  chegouEntrega,
}: {
  status: string;
  chegouEntrega?: boolean;
}) {
  let currentStepIdx = STATUS_STEPS.findIndex((s) =>
    (s.matches as readonly string[]).includes(status),
  );
  const chegouIdx = STATUS_STEPS.findIndex((s) => s.key === "chegou");
  if (status === "entregue") currentStepIdx = STATUS_STEPS.length - 1;
  else if (chegouEntrega) currentStepIdx = chegouIdx;
  return (
    <div className="bg-white border border-[#0d2c54]/10 rounded-none p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-[#0d2c54]/50 font-bold mb-4">Status do pedido</p>
      <div className="space-y-3">
        {STATUS_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const done = idx <= currentStepIdx;
          const current = idx === currentStepIdx;
          const isEntregue = step.key === "entregue" && done;
          const showRed = current && !isEntregue;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                  done
                    ? showRed
                      ? "bg-gradient-red shadow-red text-primary-foreground"
                        : "bg-[#0d2c54] text-white"
                    : "bg-gray-100 text-gray-400"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-sm ${current ? "font-bold text-[#0d2c54]" : done ? "text-[#0d2c54]" : "text-gray-400"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

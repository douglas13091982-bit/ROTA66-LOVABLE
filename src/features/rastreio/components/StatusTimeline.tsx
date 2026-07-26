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
    <div className="bg-card border border-border rounded-lg p-5 shadow-card">
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-4">Status do pedido</p>
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
                      : "bg-emerald-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className={`text-sm ${current ? "font-bold" : done ? "" : "text-muted-foreground"}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

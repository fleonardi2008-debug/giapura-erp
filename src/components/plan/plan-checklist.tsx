"use client";

import { useOptimistic, useTransition } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NuevaTareaDialog } from "@/components/plan/nueva-tarea-dialog";
import { eliminarPlanTarea, resetPlan, togglePlanTarea } from "@/lib/actions/plan";
import { hitoPara, puntosGanados, puntosTotales, type PlanFase } from "@/lib/plan";

export function PlanChecklist({ fases, hechas }: { fases: PlanFase[]; hechas: string[] }) {
  const [pending, startTransition] = useTransition();
  const [optimistas, aplicarOptimista] = useOptimistic(
    hechas,
    (actuales: string[], tareaId: string) =>
      actuales.includes(tareaId)
        ? actuales.filter((id) => id !== tareaId)
        : [...actuales, tareaId]
  );

  const hechasSet = new Set(optimistas);
  const totales = puntosTotales(fases);
  const ganados = puntosGanados(fases, hechasSet);
  const pct = totales === 0 ? 0 : Math.round((ganados / totales) * 100);

  function toggle(tareaId: string) {
    startTransition(async () => {
      aplicarOptimista(tareaId);
      const res = await togglePlanTarea(tareaId, !hechasSet.has(tareaId));
      if (res?.error) toast.error(res.error);
    });
  }

  function eliminar(tareaId: string) {
    if (!confirm("¿Borrar esta tarea?")) return;
    startTransition(async () => {
      await eliminarPlanTarea(tareaId);
      toast.success("Tarea borrada");
    });
  }

  function reiniciar() {
    if (!confirm("¿Reiniciar todo el progreso?")) return;
    startTransition(async () => {
      await resetPlan();
      toast.success("Progreso reiniciado");
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center gap-6">
        <Jar pct={pct} />
        <div>
          <p className="text-4xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
            {ganados}
            <span className="ml-1 font-mono text-base text-muted-foreground">
              / {totales} pts
            </span>
          </p>
          <p className="mt-1 font-mono text-sm text-muted-foreground">{hitoPara(pct)}</p>
        </div>
      </div>

      {fases.map((fase) => (
        <section key={fase.num} className={cn(fase.masAdelante && "opacity-70")}>
          <div className="mb-3 flex items-baseline gap-2 border-b border-border pb-2">
            <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
              {fase.num}
            </span>
            <h2 className="text-lg font-semibold">{fase.titulo}</h2>
            {fase.nota && (
              <span className="ml-auto text-xs text-muted-foreground">{fase.nota}</span>
            )}
          </div>

          <ul className="space-y-2">
            {fase.tareas.map((tarea) => {
              const hecha = hechasSet.has(tarea.id);
              return (
                <li key={tarea.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => toggle(tarea.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3.5 text-left transition-colors hover:bg-accent",
                      hecha && "opacity-60"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-600 dark:border-amber-400",
                        hecha && "bg-amber-600 dark:bg-amber-400"
                      )}
                    >
                      {hecha && <Check className="size-3 text-background" strokeWidth={3.5} />}
                    </span>
                    <span className={cn("flex-1 text-sm leading-snug", hecha && "line-through")}>
                      {tarea.texto}
                    </span>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                      +{tarea.puntos}
                    </span>
                  </button>

                  {tarea.custom && (
                    <button
                      type="button"
                      aria-label={`Borrar tarea: ${tarea.texto}`}
                      disabled={pending}
                      onClick={() => eliminar(tarea.id)}
                      className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus-visible:opacity-100"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="mt-2">
            <NuevaTareaDialog faseNumInicial={fase.num} />
          </div>
        </section>
      ))}

      <Button variant="ghost" size="sm" disabled={pending} onClick={reiniciar}>
        Reiniciar progreso
      </Button>
    </div>
  );
}

function Jar({ pct }: { pct: number }) {
  return (
    <div className="relative h-32 w-24 shrink-0">
      <div className="absolute -top-2 right-3.5 left-3.5 z-10 h-4 rounded bg-amber-500" />
      <div className="absolute inset-x-0 top-2 bottom-0 overflow-hidden rounded-t-[10px] rounded-b-[26px] border-2 border-amber-600 bg-muted dark:border-amber-400">
        <div
          className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-amber-400 to-amber-700 transition-[height] duration-700 ease-out"
          style={{ height: `${pct}%` }}
        />
      </div>
    </div>
  );
}

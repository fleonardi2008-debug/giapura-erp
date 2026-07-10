import { prisma } from "@/lib/db";
import { PlanChecklist } from "@/components/plan/plan-checklist";
import { construirFases } from "@/lib/plan";

export default async function PlanPage() {
  const [progreso, custom] = await Promise.all([
    prisma.planTareaProgreso.findMany({ where: { hecho: true } }),
    prisma.planTareaCustom.findMany({ orderBy: { creadoEn: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Plan de acción</h1>
        <p className="text-muted-foreground">
          Lanzamiento · presale septiembre. 5 frentes, un solo tarro.
        </p>
      </div>

      <PlanChecklist fases={construirFases(custom)} hechas={progreso.map((p) => p.id)} />
    </div>
  );
}

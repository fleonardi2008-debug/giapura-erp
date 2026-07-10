export type PlanTarea = {
  id: string;
  texto: string;
  puntos: number;
};

export type PlanFase = {
  num: string;
  titulo: string;
  nota?: string;
  masAdelante?: boolean;
  tareas: PlanTarea[];
};

export const PLAN_FASES: PlanFase[] = [
  {
    num: "1",
    titulo: "Hoy — destrabar",
    nota: "5 min c/u",
    tareas: [
      { id: "t1", texto: "Pedirle a Gonza los datos del RNE", puntos: 5 },
      { id: "t2", texto: "Contactar al dev de la web: contarle la estructura y qué necesitás", puntos: 10 },
      { id: "t3", texto: "Pedir precios actualizados a OPQ (proveedor)", puntos: 10 },
    ],
  },
  {
    num: "2",
    titulo: "Esta semana — decisiones que destraban todo",
    tareas: [
      { id: "t4", texto: "Definir el sistema anti-rotura del packaging (separador + papel burbuja)", puntos: 10 },
      { id: "t5", texto: "Pedir 2 presupuestos más de packaging para comparar", puntos: 10 },
      { id: "t6", texto: "Terminar el panel de administración y probar que funcione", puntos: 15 },
      { id: "t7", texto: "Hacer el rótulo/etiqueta como corresponde para el RNPA", puntos: 15 },
      { id: "t8", texto: "Comparar precios de OPQ vs. otros proveedores y decidir", puntos: 10 },
    ],
  },
  {
    num: "3",
    titulo: "Ejecución — producción y contenido",
    tareas: [
      { id: "t9", texto: "Coordinar la sesión de fotos (producto + packaging)", puntos: 15 },
      { id: "t10", texto: "Definir las piezas de contenido más importantes del calendario", puntos: 10 },
      { id: "t11", texto: "Comprar el chocolate para el reel de receta", puntos: 5 },
      { id: "t12", texto: "Grabar el primer reel (trufas de pasta de maní)", puntos: 20 },
    ],
  },
  {
    num: "4",
    titulo: "Más adelante",
    masAdelante: true,
    tareas: [
      { id: "t13", texto: "Subir las fotos nuevas a la web", puntos: 5 },
      { id: "t14", texto: "Mandarle producto a un influencer", puntos: 10 },
      { id: "t15", texto: "Cerrar estructura final de la landing (ticket fundador, testimonios, FAQ)", puntos: 15 },
      { id: "t16", texto: "Definir con el dev: pop-up de mail vs. captación en checkout", puntos: 10 },
    ],
  },
];

export const PLAN_TAREAS = PLAN_FASES.flatMap((fase) => fase.tareas);

export const PLAN_TAREA_IDS = new Set(PLAN_TAREAS.map((tarea) => tarea.id));

export const PLAN_PUNTOS_TOTALES = PLAN_TAREAS.reduce((suma, tarea) => suma + tarea.puntos, 0);

export function puntosGanados(hechas: Set<string>) {
  return PLAN_TAREAS.reduce((suma, tarea) => suma + (hechas.has(tarea.id) ? tarea.puntos : 0), 0);
}

export function hitoPara(pct: number) {
  if (pct >= 100) return "🏆 todo destrabado — a lanzar";
  if (pct >= 75) return "🚀 casi, no aflojes";
  if (pct >= 40) return "🔥 rodando de verdad";
  if (pct > 0) return "🥜 arrancaste, seguí así";
  return "arrancando";
}

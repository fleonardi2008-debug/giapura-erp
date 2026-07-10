export type PlanTarea = {
  id: string;
  texto: string;
  puntos: number;
  custom?: boolean;
};

export type PlanFase = {
  num: string;
  titulo: string;
  nota?: string;
  masAdelante?: boolean;
  tareas: PlanTarea[];
};

export const PLAN_FASES_BASE: PlanFase[] = [
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

export const PLAN_FASE_NUMS = PLAN_FASES_BASE.map((fase) => fase.num);

export const PLAN_TAREA_IDS_BASE = new Set(
  PLAN_FASES_BASE.flatMap((fase) => fase.tareas).map((tarea) => tarea.id)
);

export type PlanTareaCustom = {
  id: string;
  faseNum: string;
  texto: string;
  puntos: number;
};

export function construirFases(custom: PlanTareaCustom[]): PlanFase[] {
  return PLAN_FASES_BASE.map((fase) => ({
    ...fase,
    tareas: [
      ...fase.tareas,
      ...custom
        .filter((tarea) => tarea.faseNum === fase.num)
        .map((tarea) => ({ id: tarea.id, texto: tarea.texto, puntos: tarea.puntos, custom: true })),
    ],
  }));
}

export function todasLasTareas(fases: PlanFase[]) {
  return fases.flatMap((fase) => fase.tareas);
}

export function puntosTotales(fases: PlanFase[]) {
  return todasLasTareas(fases).reduce((suma, tarea) => suma + tarea.puntos, 0);
}

export function puntosGanados(fases: PlanFase[], hechas: Set<string>) {
  return todasLasTareas(fases).reduce(
    (suma, tarea) => suma + (hechas.has(tarea.id) ? tarea.puntos : 0),
    0
  );
}

export function hitoPara(pct: number) {
  if (pct >= 100) return "🏆 todo destrabado — a lanzar";
  if (pct >= 75) return "🚀 casi, no aflojes";
  if (pct >= 40) return "🔥 rodando de verdad";
  if (pct > 0) return "🥜 arrancaste, seguí así";
  return "arrancando";
}

// ---------- Estimación de puntos ----------
// El puntaje arranca en el peso típico de la fase y se ajusta según señales
// en el texto de la tarea. Es una estimación: siempre se puede pisar a mano.

const PUNTOS_MIN = 5;
const PUNTOS_MAX = 25;

const BASE_POR_FASE: Record<string, number> = { "1": 5, "2": 10, "3": 15, "4": 10 };

const SENALES_RAPIDAS = [
  "pedir", "pedile", "preguntar", "avisar", "mandar", "comprar", "contactar",
  "llamar", "responder", "confirmar", "reservar", "anotar", "chequear", "mirar",
];

const SENALES_PESADAS = [
  "grabar", "producir", "diseñar", "terminar", "desarrollar", "armar", "coordinar",
  "sesión", "sesion", "lanzar", "migrar", "rediseñar", "estructura", "calendario",
  "campaña", "campana", "negociar", "auditar", "filmar", "editar", "programar",
];

function normalizar(texto: string) {
  return texto.toLowerCase();
}

function contieneAlguna(texto: string, palabras: string[]) {
  return palabras.find((palabra) => texto.includes(palabra));
}

export type EstimacionPuntos = {
  puntos: number;
  razon: string;
};

export function estimarPuntos(faseNum: string, texto: string): EstimacionPuntos {
  const base = BASE_POR_FASE[faseNum] ?? 10;
  const limpio = normalizar(texto.trim());

  if (limpio.length < 3) {
    return { puntos: base, razon: `Peso típico de la fase ${faseNum}.` };
  }

  let puntos = base;
  const motivos: string[] = [`base ${base} por la fase ${faseNum}`];

  const rapida = contieneAlguna(limpio, SENALES_RAPIDAS);
  const pesada = contieneAlguna(limpio, SENALES_PESADAS);

  if (rapida && !pesada) {
    puntos -= 5;
    motivos.push(`“${rapida}” suena a trámite corto (−5)`);
  }

  if (pesada) {
    puntos += 5;
    motivos.push(`“${pesada}” implica producción o decisión pesada (+5)`);
  }

  // Una tarea larga, o con varias partes encadenadas, suele esconder más trabajo.
  const partes = (limpio.match(/,| y | \+ /g) ?? []).length;
  if (limpio.length > 70 || partes >= 2) {
    puntos += 5;
    motivos.push("tiene varias partes (+5)");
  }

  const acotado = Math.min(PUNTOS_MAX, Math.max(PUNTOS_MIN, puntos));

  return { puntos: acotado, razon: motivos.join(", ") + "." };
}

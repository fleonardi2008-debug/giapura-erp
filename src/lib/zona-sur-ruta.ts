import type { Punto } from "@/lib/zona-sur-geo";

export type ParadaRuta = { id: string; punto: Punto };
export type TramoRuta = { paradaId: string; minutos: number; km: number };
export type Tramo = { minutos: number; km: number };
export type ResultadoRuta = {
  aRetiro: Tramo; // de la salida al lugar donde se buscan las cajas
  orden: TramoRuta[]; // entregas en el orden recomendado
  final: Tramo | null; // hasta el punto de llegada, si se cargó uno
  minutosTotal: number;
  kmTotal: number;
};

const OSRM = "https://router.project-osrm.org";
const coord = (p: Punto) => `${p.lng},${p.lat}`;

/**
 * Mejor orden para pasar por las paradas 1..n saliendo del nodo 0 y, si hay llegada, terminando en el nodo n + 1.
 * Hasta 12 paradas se prueba todo (programación dinámica: el orden es el mejor posible); con más, se parte de
 * "ir siempre al más cercano" y se mejora con intercambios (2-opt y mover paradas) hasta que ya no mejora.
 * `costo[i][j]` es el tiempo de manejo de i a j.
 */
export function mejorOrden(costo: number[][], n: number, conLlegada: boolean): number[] {
  if (n <= 1) return n === 1 ? [1] : [];
  const fin = conLlegada ? n + 1 : -1;
  const cierre = (u: number) => (fin >= 0 ? costo[u][fin] : 0);

  if (n <= 12) {
    const total = 1 << n;
    const dp = Array.from({ length: total }, () => new Array<number>(n).fill(Infinity));
    const padre = Array.from({ length: total }, () => new Array<number>(n).fill(-1));
    for (let j = 0; j < n; j++) dp[1 << j][j] = costo[0][j + 1];
    for (let mask = 1; mask < total; mask++) {
      for (let j = 0; j < n; j++) {
        const actual = dp[mask][j];
        if (!(mask & (1 << j)) || actual === Infinity) continue;
        for (let k = 0; k < n; k++) {
          if (mask & (1 << k)) continue;
          const nuevo = actual + costo[j + 1][k + 1];
          const m2 = mask | (1 << k);
          if (nuevo < dp[m2][k]) {
            dp[m2][k] = nuevo;
            padre[m2][k] = j;
          }
        }
      }
    }
    let mejor = Infinity;
    let ultimo = 0;
    for (let j = 0; j < n; j++) {
      const t = dp[total - 1][j] + cierre(j + 1);
      if (t < mejor) {
        mejor = t;
        ultimo = j;
      }
    }
    const orden: number[] = [];
    let mask = total - 1;
    let j = ultimo;
    while (j >= 0) {
      orden.push(j + 1);
      const previo = padre[mask][j];
      mask &= ~(1 << j);
      j = previo;
    }
    return orden.reverse();
  }

  // Muchas paradas: el más cercano primero y después mejoras locales.
  const pendientes = new Set(Array.from({ length: n }, (_, i) => i + 1));
  const orden: number[] = [];
  let actual = 0;
  while (pendientes.size) {
    let cercano = -1;
    for (const p of pendientes) if (cercano < 0 || costo[actual][p] < costo[actual][cercano]) cercano = p;
    orden.push(cercano);
    pendientes.delete(cercano);
    actual = cercano;
  }
  const largo = (o: number[]) => {
    let t = costo[0][o[0]];
    for (let i = 0; i < o.length - 1; i++) t += costo[o[i]][o[i + 1]];
    return t + cierre(o[o.length - 1]);
  };
  let mejora = true;
  while (mejora) {
    mejora = false;
    for (let i = 0; i < n - 1 && !mejora; i++) {
      for (let j = i + 1; j < n && !mejora; j++) {
        const invertido = [...orden.slice(0, i), ...orden.slice(i, j + 1).reverse(), ...orden.slice(j + 1)];
        if (largo(invertido) < largo(orden) - 1e-9) {
          orden.splice(0, n, ...invertido);
          mejora = true;
        }
      }
    }
    for (let i = 0; i < n && !mejora; i++) {
      const sin = orden.filter((_, k) => k !== i);
      for (let j = 0; j <= sin.length && !mejora; j++) {
        if (j === i) continue;
        const movido = [...sin.slice(0, j), orden[i], ...sin.slice(j)];
        if (largo(movido) < largo(orden) - 1e-9) {
          orden.splice(0, n, ...movido);
          mejora = true;
        }
      }
    }
  }
  return orden;
}

/**
 * Calcula el recorrido: salida -> retiro de cajas (primera parada, fija) -> entregas en el mejor orden por tiempo
 * de manejo -> llegada (opcional; si no hay, termina en la última entrega). Los tiempos entre todos los puntos
 * los da OSRM (rutas por calles, gratis) en una sola consulta desde el navegador; el orden lo elige `mejorOrden`.
 * Devuelve null si el servicio no responde.
 */
export async function calcularRuta(
  inicio: Punto,
  retiro: Punto,
  paradas: ParadaRuta[],
  fin: Punto | null
): Promise<ResultadoRuta | null> {
  try {
    // Puntos: 0 = salida, 1 = retiro, 2..n+1 = entregas, n+2 = llegada (si hay).
    const n = paradas.length;
    const puntos = [inicio, retiro, ...paradas.map((p) => p.punto), ...(fin ? [fin] : [])];
    const res = await fetch(
      `${OSRM}/table/v1/driving/${puntos.map(coord).join(";")}?annotations=duration,distance`
    );
    if (!res.ok) return null;
    const datos = (await res.json()) as { code: string; durations: (number | null)[][]; distances: (number | null)[][] };
    if (datos.code !== "Ok" || !datos.durations || !datos.distances) return null;
    const dur = datos.durations;
    const dist = datos.distances;
    for (const fila of dur) if (fila.some((v) => v == null)) return null;

    // Se arma la submatriz que arranca en el retiro: 0 = retiro, 1..n = entregas, n+1 = llegada.
    const idx = [1, ...Array.from({ length: n }, (_, i) => i + 2), ...(fin ? [n + 2] : [])];
    const costo = idx.map((i) => idx.map((j) => dur[i][j] as number));
    const orden = mejorOrden(costo, n, !!fin);

    const aRetiro = { minutos: (dur[0][1] as number) / 60, km: (dist[0][1] as number) / 1000 };
    const tramos: TramoRuta[] = [];
    let previo = 1;
    for (const k of orden) {
      const nodo = k + 1; // posición real en `puntos`
      tramos.push({
        paradaId: paradas[k - 1].id,
        minutos: (dur[previo][nodo] as number) / 60,
        km: (dist[previo][nodo] as number) / 1000,
      });
      previo = nodo;
    }
    const final = fin
      ? { minutos: (dur[previo][n + 2] as number) / 60, km: (dist[previo][n + 2] as number) / 1000 }
      : null;
    const minutosTotal = aRetiro.minutos + tramos.reduce((a, t) => a + t.minutos, 0) + (final?.minutos ?? 0);
    const kmTotal = aRetiro.km + tramos.reduce((a, t) => a + t.km, 0) + (final?.km ?? 0);
    return { aRetiro, orden: tramos, final, minutosTotal, kmTotal };
  } catch {
    return null;
  }
}

/**
 * Enlaces de Google Maps con el recorrido en orden. Google acepta ~9 paradas intermedias por enlace;
 * si hay más, se parte en varios tramos consecutivos.
 */
export function enlacesGoogleMaps(inicio: string, paradas: string[], fin: string): string[] {
  const puntos = [inicio, ...paradas, fin];
  const enlaces: string[] = [];
  const POR_ENLACE = 10; // origen + 9 paradas + destino
  for (let i = 0; i < puntos.length - 1; i += POR_ENLACE - 1) {
    const tramo = puntos.slice(i, i + POR_ENLACE);
    if (tramo.length < 2) break;
    const params = new URLSearchParams({
      api: "1",
      travelmode: "driving",
      origin: tramo[0],
      destination: tramo[tramo.length - 1],
    });
    const medio = tramo.slice(1, -1);
    if (medio.length) params.set("waypoints", medio.join("|"));
    enlaces.push(`https://www.google.com/maps/dir/?${params.toString()}`);
  }
  return enlaces;
}

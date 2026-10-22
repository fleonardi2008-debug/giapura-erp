/**
 * Precio pagando en efectivo: el descuento se aplica al total de los productos (no al envío) y el
 * resultado se redondea a los $100 más cercanos, así quedan precios "redondos" (6.670 -> 6.000,
 * 16.120 -> 14.500). Nunca da más que el precio de lista.
 */
export function precioEnEfectivo(monto: number, descuentoPct: number): number {
  if (!(descuentoPct > 0) || monto <= 0) return monto;
  const conDescuento = Math.round((monto * (1 - descuentoPct / 100)) / 100) * 100;
  return Math.min(monto, conDescuento);
}

/** Cuánto se descuenta del total de productos al pagar en efectivo. */
export function descuentoEfectivo(monto: number, descuentoPct: number): number {
  return monto - precioEnEfectivo(monto, descuentoPct);
}

type PedidoConDatosAndreani = {
  clienteNombre: string;
  clienteEmail: string;
  clienteTelefono: string;
  clienteDni: string | null;
  andreaniModalidad: string | null;
  envioCalle: string | null;
  envioNumero: string | null;
  envioPiso: string | null;
  envioCp: string | null;
  envioCiudad: string | null;
  envioProvincia: string | null;
  envioAConfirmar: boolean;
  costoEnvio: { toString(): string } | number;
  total: { toString(): string } | number;
  items: { cantidad: number; nombre: string }[];
};

/** Los datos del pedido en el mismo orden que el formulario "Nueva orden" de RedChat. */
export function filasDatosAndreani(pedido: PedidoConDatosAndreani) {
  const costoEnvio = Number(pedido.costoEnvio);
  return [
    { etiqueta: "Nombre del cliente", valor: pedido.clienteNombre },
    { etiqueta: "Email", valor: pedido.clienteEmail },
    { etiqueta: "Teléfono", valor: pedido.clienteTelefono },
    { etiqueta: "DNI", valor: pedido.clienteDni ?? "" },
    {
      etiqueta: "Método de envío",
      valor: pedido.andreaniModalidad === "SUCURSAL" ? "Andreani a sucursal" : "Andreani a domicilio",
    },
    { etiqueta: "Calle", valor: pedido.envioCalle ?? "" },
    { etiqueta: "Número", valor: pedido.envioNumero ?? "" },
    { etiqueta: "Piso / Dpto", valor: pedido.envioPiso ?? "" },
    { etiqueta: "Código postal", valor: pedido.envioCp ?? "" },
    { etiqueta: "Ciudad", valor: pedido.envioCiudad ?? "" },
    { etiqueta: "Provincia", valor: pedido.envioProvincia ?? "" },
    { etiqueta: "Productos", valor: pedido.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(", ") },
    { etiqueta: "Monto total (ARS)", valor: String(Number(pedido.total) - costoEnvio) },
    {
      etiqueta: "Envío cobrado (ARS)",
      valor: pedido.envioAConfirmar ? "A confirmar con el cliente" : String(costoEnvio),
    },
  ];
}

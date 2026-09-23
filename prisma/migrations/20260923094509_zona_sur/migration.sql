-- CreateEnum
CREATE TYPE "ZonaSurMetodoEntrega" AS ENUM ('ENVIO_ZONA', 'PUNTO_QUILMES', 'PUNTO_BERNAL');

-- CreateEnum
CREATE TYPE "ZonaSurMetodoPago" AS ENUM ('TRANSFERENCIA', 'EFECTIVO');

-- CreateEnum
CREATE TYPE "ZonaSurEstado" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'ENTREGADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "ZonaSurConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "zonaNombre" TEXT NOT NULL DEFAULT 'Zona Sur',
    "zonaCentroLat" DOUBLE PRECISION NOT NULL DEFAULT -34.7206,
    "zonaCentroLng" DOUBLE PRECISION NOT NULL DEFAULT -58.2681,
    "zonaRadioKm" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "zonaPrecio" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cbuAlias" TEXT,
    "titularCuenta" TEXT,
    "puntoQuilmesTexto" TEXT,
    "puntoBernalTexto" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZonaSurConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaSurPedido" (
    "id" TEXT NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "metodoEntrega" "ZonaSurMetodoEntrega" NOT NULL,
    "direccion" TEXT,
    "puntoElegido" TEXT,
    "metodoPago" "ZonaSurMetodoPago" NOT NULL,
    "comprobanteUrl" TEXT,
    "total" DECIMAL(14,2) NOT NULL,
    "estado" "ZonaSurEstado" NOT NULL DEFAULT 'PENDIENTE',
    "nota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZonaSurPedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZonaSurPedidoItem" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "skuId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL(14,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "ZonaSurPedidoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ZonaSurPedido_createdAt_idx" ON "ZonaSurPedido"("createdAt");

-- CreateIndex
CREATE INDEX "ZonaSurPedido_estado_idx" ON "ZonaSurPedido"("estado");

-- AddForeignKey
ALTER TABLE "ZonaSurPedidoItem" ADD CONSTRAINT "ZonaSurPedidoItem_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "ZonaSurPedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZonaSurPedidoItem" ADD CONSTRAINT "ZonaSurPedidoItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE SET NULL ON UPDATE CASCADE;

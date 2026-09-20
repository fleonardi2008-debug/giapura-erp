-- CreateEnum
CREATE TYPE "EstadoCompra" AS ENUM ('COMPRADO', 'RECIBIDO', 'CANCELADO');

-- AlterTable
ALTER TABLE "MovimientoStock" ADD COLUMN     "compraId" TEXT;

-- CreateTable
CREATE TABLE "CompraInsumo" (
    "id" TEXT NOT NULL,
    "insumoId" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "costoUnitario" DECIMAL(14,4) NOT NULL,
    "costoTotal" DECIMAL(14,2) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCompra" NOT NULL DEFAULT 'COMPRADO',
    "recibidaAt" TIMESTAMP(3),
    "proveedor" TEXT,
    "nota" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompraInsumo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompraInsumo_estado_idx" ON "CompraInsumo"("estado");

-- CreateIndex
CREATE INDEX "CompraInsumo_insumoId_idx" ON "CompraInsumo"("insumoId");

-- CreateIndex
CREATE INDEX "CompraInsumo_fecha_idx" ON "CompraInsumo"("fecha");

-- AddForeignKey
ALTER TABLE "CompraInsumo" ADD CONSTRAINT "CompraInsumo_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "Insumo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompraInsumo" ADD CONSTRAINT "CompraInsumo_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoStock" ADD CONSTRAINT "MovimientoStock_compraId_fkey" FOREIGN KEY ("compraId") REFERENCES "CompraInsumo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

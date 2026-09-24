-- AlterEnum
ALTER TYPE "TipoMovimientoStock" ADD VALUE 'TRANSFERENCIA_ZONA';

-- AlterTable
ALTER TABLE "Sku" ADD COLUMN     "stockMinimo" INTEGER;

-- CreateTable
CREATE TABLE "StockZona" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "cantidadActual" INTEGER NOT NULL DEFAULT 0,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockZona_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockZona_skuId_key" ON "StockZona"("skuId");

-- AddForeignKey
ALTER TABLE "StockZona" ADD CONSTRAINT "StockZona_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

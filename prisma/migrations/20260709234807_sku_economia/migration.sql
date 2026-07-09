-- AlterTable
ALTER TABLE "Sku" ADD COLUMN     "gastosGeneralesMensuales" DECIMAL(14,2),
ADD COLUMN     "perdidaPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "precioVenta" DECIMAL(14,2),
ADD COLUMN     "produccionMensualEstimada" INTEGER;

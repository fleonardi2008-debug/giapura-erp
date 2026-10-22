-- AlterTable
ALTER TABLE "Sku" ADD COLUMN     "precioZonaSur" DECIMAL(14,2);

-- AlterTable
ALTER TABLE "ZonaSurConfig" ADD COLUMN     "descuentoEfectivo" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ZonaSurPedido" ADD COLUMN     "descuento" DECIMAL(14,2) NOT NULL DEFAULT 0;

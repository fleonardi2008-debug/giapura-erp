-- AlterTable
ALTER TABLE "Pedido" ADD COLUMN "shopifyOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Pedido_shopifyOrderId_key" ON "Pedido"("shopifyOrderId");

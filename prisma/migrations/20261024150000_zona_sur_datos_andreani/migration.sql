-- Datos de envío del cliente para cargarlos en RedChat (solo pedidos por Andreani).
ALTER TABLE "ZonaSurPedido" ADD COLUMN "clienteDni" TEXT;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "andreaniModalidad" TEXT;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioCalle" TEXT;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioNumero" TEXT;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioPiso" TEXT;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioCp" TEXT;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioCiudad" TEXT;
ALTER TABLE "ZonaSurPedido" ADD COLUMN "envioProvincia" TEXT;

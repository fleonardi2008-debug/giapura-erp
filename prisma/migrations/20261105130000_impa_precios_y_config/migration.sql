-- Precios y configuración propios de la página del IMPA.
ALTER TABLE "Sku" ADD COLUMN "precioImpa" DECIMAL(14,2);
ALTER TABLE "Sku" ADD COLUMN "precioImpaTachado" DECIMAL(14,2);
ALTER TABLE "ZonaSurConfig" ADD COLUMN "impaDias" TEXT;
ALTER TABLE "ZonaSurConfig" ADD COLUMN "impaOpciones" TEXT NOT NULL DEFAULT 'A la entrada' || chr(10) || 'A la salida';
ALTER TABLE "ZonaSurConfig" ADD COLUMN "impaLugar" TEXT;

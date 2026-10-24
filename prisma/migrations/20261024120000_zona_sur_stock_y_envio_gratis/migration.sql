-- Stock de frascos para entrega propia en Zona Sur (barra en /zona-sur).
ALTER TABLE "Sku" ADD COLUMN "stockZonaSur" INTEGER;

-- El envío a domicilio en Zona Sur pasa a ser gratis.
UPDATE "ZonaSurConfig" SET "zonaPrecio" = 0;

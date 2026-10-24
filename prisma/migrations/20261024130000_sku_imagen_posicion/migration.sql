-- Posición de la foto dentro del cuadrado de /zona-sur (50 = centro).
ALTER TABLE "Sku" ADD COLUMN "imagenPosX" INTEGER NOT NULL DEFAULT 50;
ALTER TABLE "Sku" ADD COLUMN "imagenPosY" INTEGER NOT NULL DEFAULT 50;

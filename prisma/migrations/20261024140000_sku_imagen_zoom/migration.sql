-- Zoom de la foto en el cuadrado de /zona-sur (100 = sin zoom).
ALTER TABLE "Sku" ADD COLUMN "imagenZoom" INTEGER NOT NULL DEFAULT 100;

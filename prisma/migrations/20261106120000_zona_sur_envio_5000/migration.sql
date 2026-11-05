-- El envío a domicilio de Zona Sur deja de ser gratis: pasa a $5.000 (se puede cambiar desde Configurar zona).
UPDATE "ZonaSurConfig" SET "zonaPrecio" = 5000 WHERE "id" = 'singleton';

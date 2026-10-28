-- Las etapas de un pedido de Zona Sur pasan a ser Pendiente, Preparado y Entregado (los "confirmados" pasan a "preparados").
ALTER TYPE "ZonaSurEstado" RENAME VALUE 'CONFIRMADO' TO 'PREPARADO';

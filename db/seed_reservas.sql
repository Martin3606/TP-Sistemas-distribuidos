-- Carga reservas de prueba directo por SQL.
-- Requiere que ya hayas corrido db/seed.sql (usa cliente id=1 y vehiculo id=1).
-- Uso: docker exec -i rentar-mysql mysql -u rentar_user -prentar_pass rentar < db/seed_reservas.sql

USE rentar;

INSERT INTO reserva (cliente_id, vehiculo_id, fecha_inicio, fecha_fin, precio_diario_snapshot, importe_total, estado)
VALUES
  -- Reserva futura y CONFIRMADA: usala para probar el PATCH /reservas/1/cancelar (caso feliz)
  (1, 1, '2026-10-01 10:00:00', '2026-10-05 10:00:00', 15000.00, 60000.00, 'CONFIRMADA'),

  -- Reserva ya "empezada" (fecha_inicio en el pasado): usala para probar que
  -- NO se puede cancelar un período que ya arrancó. El endpoint de Alta nunca
  -- te dejaría crear esto por API a propósito, por eso va directo por SQL.
  (1, 1, '2020-01-01 10:00:00', '2020-01-03 10:00:00', 15000.00, 30000.00, 'CONFIRMADA');

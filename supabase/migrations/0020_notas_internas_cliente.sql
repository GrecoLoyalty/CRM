-- =====================================================================
-- 0020 — Notas internas / datos extra del cliente
-- =====================================================================
-- Pedido: poder editar la info del cliente y agregar datos extra que no
-- encajan en ningún campo existente (nombre_empresa, telefono, giro,
-- necesidad_detectada, etc. ya eran editables por Root/CEO vía RLS,
-- pero no había ningún formulario en la UI para hacerlo — y no existía
-- ningún campo libre para anotar cosas que no caben en la ficha
-- estructurada). `notas_internas` es un campo de texto libre, solo
-- visible dentro del CRM (nunca se expone en el portal público del
-- cliente), pensado para datos sueltos: acuerdos verbales, contexto de
-- la relación, preferencias del cliente, lo que sea.
-- =====================================================================

alter table clientes add column if not exists notas_internas text;

comment on column clientes.notas_internas is
  'Notas libres / datos extra sobre el cliente, editable por Root y CEO desde la ficha. Uso interno — nunca se muestra en el portal público del cliente.';

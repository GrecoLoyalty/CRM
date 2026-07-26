-- =====================================================================
-- 0019 — Materiales visibles en el portal del cliente
-- =====================================================================
-- Todo lo que se sube a la ficha de un cliente (documentos, fotos, un
-- manual de identidad, lo que sea) ahora es visible también en SU portal
-- por defecto — para que no tengan que pedirlo por otro medio.
--
-- Se agrega `visible_portal` (default true = "todos", como se pidió) por
-- si en algún momento hay que subir algo interno/borrador que NO debe
-- llegar al cliente — se puede apagar solo para ese archivo puntual.
-- =====================================================================

alter table materiales_cliente add column visible_portal boolean not null default true;

comment on column materiales_cliente.visible_portal is
  'Si es true (default), el material aparece también en el portal público del cliente. Se puede apagar por archivo puntual para cosas internas que no deban verse afuera.';

-- Faltaba una política de UPDATE (solo existían select/insert/delete) —
-- necesaria para poder alternar visible_portal desde la ficha del cliente.
create policy materiales_cliente_update on materiales_cliente for update
  using (subido_por = auth.uid() or fn_mi_rol() in ('root', 'ceo'));

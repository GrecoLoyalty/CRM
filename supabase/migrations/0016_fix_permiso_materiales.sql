-- =====================================================================
-- 0016 — Materiales: mismo criterio de acceso que ver la ficha del cliente
-- =====================================================================
-- Bug reportado: alguien subía un archivo y, al volver a entrar, no
-- aparecía. Causa: materiales_cliente usaba fn_es_encargado_cliente (el
-- criterio MÁS ESTRICTO — vendedor/analista principal, tarea asignada, o
-- equipo del cliente), pero para VER la ficha del cliente basta con
-- criterios más amplios que ya existían (ej. cualquier analista puede ver
-- cualquier cliente en análisis, aunque no sea "su" cliente asignado).
-- Resultado: alguien podía entrar a la ficha y subir un archivo — el
-- archivo llegaba al bucket, pero el registro que lo hace aparecer en la
-- lista se rechazaba por RLS, así que el archivo quedaba "huérfano" y
-- nunca se veía en el CRM.
--
-- Esta migración agrega fn_puede_ver_cliente(), que junta EXACTAMENTE
-- los mismos criterios que ya usan las políticas de select de `clientes`,
-- y hace que materiales_cliente y el bucket de Storage usen ese mismo
-- criterio — así "si puedes ver la ficha, puedes ver y subir materiales".
-- =====================================================================

create or replace function fn_puede_ver_cliente(p_cliente_id uuid) returns boolean as $$
  select exists (
    select 1 from clientes c
    where c.id = p_cliente_id
      and (
        fn_mi_rol() in ('root', 'ceo')
        or (fn_mi_rol() = 'vendedor' and c.vendedor_id = auth.uid())
        or fn_mi_rol() = 'analista'
        or exists (select 1 from tareas t where t.cliente_id = c.id and t.asignado_a = auth.uid())
        or exists (select 1 from cliente_equipo ce where ce.cliente_id = c.id and ce.perfil_id = auth.uid())
      )
  );
$$ language sql stable security definer;

comment on function fn_puede_ver_cliente(uuid) is
  'Junta los mismos criterios que las políticas de select de clientes (root/ceo, vendedor propio, cualquier analista, tarea asignada, o equipo del cliente). Usado por materiales_cliente para que "si puedes ver la ficha, puedes ver y subir materiales" — a diferencia de fn_es_encargado_cliente, que es más estricto y se usa para permisos de gestión (mover etapa, etc).';

-- ---------------------------------------------------------------------
-- Reemplazar las políticas de materiales_cliente y de Storage para usar
-- el criterio correcto (más amplio) en lugar de fn_es_encargado_cliente.
-- ---------------------------------------------------------------------
drop policy if exists materiales_cliente_select on materiales_cliente;
drop policy if exists materiales_cliente_insert on materiales_cliente;

create policy materiales_cliente_select on materiales_cliente for select
  using (fn_puede_ver_cliente(cliente_id));

create policy materiales_cliente_insert on materiales_cliente for insert
  with check (subido_por = auth.uid() and fn_puede_ver_cliente(cliente_id));

drop policy if exists "materiales_cliente_storage_select" on storage.objects;
drop policy if exists "materiales_cliente_storage_insert" on storage.objects;

create policy "materiales_cliente_storage_select" on storage.objects for select
  using (bucket_id = 'materiales-cliente' and fn_puede_ver_cliente((storage.foldername(name))[1]::uuid));

create policy "materiales_cliente_storage_insert" on storage.objects for insert
  with check (bucket_id = 'materiales-cliente' and fn_puede_ver_cliente((storage.foldername(name))[1]::uuid));

-- (delete se queda igual: solo quien lo subió o Root — no se toca)

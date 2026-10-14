drop policy marcas_manage on marcas;
create policy marcas_manage on marcas for all
  using (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'));

drop policy guiones_manage on guiones;
create policy guiones_manage on guiones for all
  using (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'));

drop policy guiones_select on guiones;
create policy guiones_select on guiones for select using (
  fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing')
  or exists (
    select 1 from publicaciones p
    where p.guion_id = guiones.id
      and p.responsable_id = auth.uid()
      and p.estado = 'pendiente'
  )
);

drop policy guion_escenas_manage on guion_escenas;
create policy guion_escenas_manage on guion_escenas for all
  using (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'));

drop policy publicaciones_select on publicaciones;
create policy publicaciones_select on publicaciones for select using (
  fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing')
  or responsable_id = auth.uid()
);

drop policy publicaciones_manage on publicaciones;
create policy publicaciones_manage on publicaciones for all
  using (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'))
  with check (fn_mi_rol() in ('root', 'ceo', 'analista', 'marketing'));

create or replace function fn_reemplazar_escenas(p_guion_id uuid, p_escenas jsonb)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or fn_mi_rol() not in ('root', 'ceo', 'analista', 'marketing') then
    raise exception 'No tienes permiso para editar las escenas del guion.';
  end if;
  if jsonb_typeof(p_escenas) is distinct from 'array' then
    raise exception 'Las escenas deben enviarse como una lista.';
  end if;

  delete from guion_escenas where guion_id = p_guion_id;
  insert into guion_escenas (guion_id, orden, visual, audio, texto_pantalla)
  select p_guion_id, (item->>'orden')::integer,
         coalesce(item->>'visual', ''), coalesce(item->>'audio', ''),
         coalesce(item->>'texto_pantalla', '')
  from jsonb_array_elements(p_escenas) as escenas(item)
  order by (item->>'orden')::integer;
end;
$$;

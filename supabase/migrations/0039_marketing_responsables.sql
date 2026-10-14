create or replace function fn_usuarios_asignables_marketing()
returns table (id uuid, nombre_completo text, role text, departamento text)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or coalesce(fn_mi_rol()::text, '') not in ('root', 'ceo', 'analista', 'marketing') then
    raise exception 'No tienes permiso para consultar responsables de publicación.';
  end if;

  return query
  select p.id, p.nombre_completo, p.role::text, coalesce(p.depto::text, '')
  from perfiles p
  where p.activo
  order by p.nombre_completo;
end;
$$;

revoke all on function fn_usuarios_asignables_marketing() from public, anon;
grant execute on function fn_usuarios_asignables_marketing() to authenticated;

create or replace function fn_clientes_para_marcas()
returns table (id uuid, nombre_empresa text, foto_url text)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or coalesce(fn_mi_rol()::text, '') not in ('root', 'ceo', 'analista', 'marketing') then
    raise exception 'No tienes permiso para consultar los clientes para Marketing.';
  end if;

  return query
  select c.id, c.nombre_empresa, c.foto_url
  from clientes c
  order by c.nombre_empresa;
end;
$$;

revoke all on function fn_clientes_para_marcas() from public, anon;
grant execute on function fn_clientes_para_marcas() to authenticated;

create or replace function fn_reemplazar_escenas(p_guion_id uuid, p_escenas jsonb)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or coalesce(fn_mi_rol()::text, '') not in ('root', 'ceo', 'analista', 'marketing') then
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

revoke all on function fn_reemplazar_escenas(uuid, jsonb) from public, anon;
grant execute on function fn_reemplazar_escenas(uuid, jsonb) to authenticated;

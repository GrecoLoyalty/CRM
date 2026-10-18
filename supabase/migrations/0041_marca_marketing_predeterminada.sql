alter table marcas
  add column if not exists predeterminada boolean not null default false;

create unique index if not exists idx_marcas_una_predeterminada
  on marcas (predeterminada)
  where predeterminada;

do $$
begin
  if (select count(*) from marcas where activa) = 1 then
    update marcas set predeterminada = true where activa;
  end if;
end;
$$;

create or replace function fn_establecer_marca_predeterminada(p_marca_id uuid)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or fn_mi_rol() not in ('root', 'ceo', 'marketing') then
    raise exception 'No tienes permiso para cambiar la marca predeterminada.';
  end if;

  if not exists (select 1 from marcas where id = p_marca_id and activa) then
    raise exception 'La marca debe existir y estar activa.';
  end if;

  update marcas set predeterminada = false where predeterminada;
  update marcas set predeterminada = true where id = p_marca_id;
end;
$$;

revoke all on function fn_establecer_marca_predeterminada(uuid) from public, anon;
grant execute on function fn_establecer_marca_predeterminada(uuid) to authenticated;

alter table marcas
  add column cliente_id uuid references clientes(id) on delete set null;

drop index if exists idx_marcas_nombre_activo;
alter table marcas drop constraint if exists marcas_plataformas_activas_check;

create index idx_marcas_cliente on marcas(cliente_id) where cliente_id is not null;

insert into marcas (cliente_id, nombre, logo_url)
select c.id, c.nombre_empresa,
       case when c.foto_url ~* '^https?://' then c.foto_url else null end
from clientes c
where not exists (
  select 1 from marcas m where m.cliente_id = c.id
);

create or replace function fn_clientes_para_marcas()
returns table (id uuid, nombre_empresa text, foto_url text)
language plpgsql
stable
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null or fn_mi_rol() not in ('root', 'ceo', 'analista', 'marketing') then
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

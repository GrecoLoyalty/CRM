-- =====================================================================
-- 0015 — Materiales del cliente (documentos, fotos y demás archivos)
-- =====================================================================
-- Acceso rápido a archivos dentro del expediente de cada cliente, visible
-- para todo su equipo. Se apoya en dos piezas:
--   1. Un bucket privado de Supabase Storage ("materiales-cliente") donde
--      vive el archivo en sí.
--   2. Una tabla de metadatos (materiales_cliente) con nombre, quién lo
--      subió, descripción, etc. — para poder listar/buscar sin tener que
--      llamar al Storage API cada vez, y para reusar el mismo criterio de
--      acceso (fn_es_encargado_cliente) que ya usa el resto del CRM.
--
-- Convención de carpetas dentro del bucket: "{cliente_id}/{archivo}" — así
-- las políticas de Storage pueden derivar a qué cliente pertenece cada
-- archivo directamente de su ruta.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('materiales-cliente', 'materiales-cliente', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Metadatos
-- ---------------------------------------------------------------------
create table materiales_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  storage_path text not null,
  nombre_archivo text not null,
  tipo_mime text,
  tamano_bytes bigint,
  descripcion text,
  subido_por uuid references perfiles(id),
  created_at timestamptz not null default now()
);

comment on table materiales_cliente is
  'Documentos, fotos y demás archivos del expediente de un cliente. El archivo real vive en el bucket de Storage "materiales-cliente" bajo la ruta {cliente_id}/{archivo}; esta tabla solo guarda los metadatos para listar/buscar rápido.';

create index idx_materiales_cliente_cliente on materiales_cliente(cliente_id, created_at desc);

alter table materiales_cliente enable row level security;

create policy materiales_cliente_select on materiales_cliente for select
  using (fn_mi_rol() in ('root', 'ceo') or fn_es_encargado_cliente(cliente_id));

create policy materiales_cliente_insert on materiales_cliente for insert
  with check (subido_por = auth.uid() and (fn_mi_rol() in ('root', 'ceo') or fn_es_encargado_cliente(cliente_id)));

-- Quien lo subió, o Root/CEO, lo puede borrar (igual que el resto del CRM: Root borra todo, CEO no de más).
create policy materiales_cliente_delete on materiales_cliente for delete
  using (subido_por = auth.uid() or fn_mi_rol() = 'root');

-- ---------------------------------------------------------------------
-- Políticas de Storage — mismo criterio de acceso que la tabla de arriba,
-- derivando el cliente_id directamente de la carpeta del archivo.
-- ---------------------------------------------------------------------
create policy "materiales_cliente_storage_select" on storage.objects for select
  using (
    bucket_id = 'materiales-cliente'
    and (fn_mi_rol() in ('root', 'ceo') or fn_es_encargado_cliente((storage.foldername(name))[1]::uuid))
  );

create policy "materiales_cliente_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'materiales-cliente'
    and (fn_mi_rol() in ('root', 'ceo') or fn_es_encargado_cliente((storage.foldername(name))[1]::uuid))
  );

create policy "materiales_cliente_storage_delete" on storage.objects for delete
  using (
    bucket_id = 'materiales-cliente'
    and (owner = auth.uid() or fn_mi_rol() = 'root')
  );

alter publication supabase_realtime add table materiales_cliente;

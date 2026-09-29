-- Client-linked meetings are private in the portal unless staff explicitly shares them.
alter table public.eventos_calendario
  add column if not exists visible_portal boolean not null default false;

comment on column public.eventos_calendario.visible_portal is
  'When true, the client-linked event may be shown in that client portal.';
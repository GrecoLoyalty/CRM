-- Track which Google Calendar contains each mirrored CRM event.
alter table public.eventos_calendario
  add column if not exists google_calendar_id text;

update public.eventos_calendario
set google_calendar_id = 'primary'
where google_event_id is not null
  and google_calendar_id is null;

comment on column public.eventos_calendario.google_calendar_id is
  'Google Calendar ID containing the mirrored event; legacy user calendars use primary.';
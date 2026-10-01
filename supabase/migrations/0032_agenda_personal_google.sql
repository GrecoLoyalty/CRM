-- Map each personal CRM agenda block to its owner's Google Calendar event.
alter table public.agenda_personal
  add column if not exists google_event_id text;

comment on column public.agenda_personal.google_event_id is
  'Event ID mirrored to the owner''s primary Google Calendar.';
-- Fix: allow re-booking a slot after it was cancelled/rejected.
-- The old UNIQUE constraint blocked inserts even when status != active.
-- Use a partial unique index for active bookings only.

do $$
begin
  -- Drop previous constraint if it exists
  if exists (
    select 1
    from pg_constraint
    where conname = 'uq_bookings_field_date_start'
  ) then
    alter table public.bookings drop constraint uq_bookings_field_date_start;
  end if;
end $$;

create unique index if not exists uq_bookings_active_field_date_start
on public.bookings (field_id, booking_date, start_time)
where status in ('pending', 'approved');


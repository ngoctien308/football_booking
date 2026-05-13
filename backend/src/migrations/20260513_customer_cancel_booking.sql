-- Allow tracking when a booking is cancelled (by customer before owner approval)
alter table public.bookings
add column if not exists cancelled_at timestamptz null;


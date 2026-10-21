-- The Reference Edit: one complete collection snapshot per authenticated user.
-- Collection contents are stored as plaintext JSON in the Supabase database.
create table if not exists public.collection_sync (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.collection_sync enable row level security;

-- A signed-in user may only read or modify the row whose id matches their auth uid.
drop policy if exists "Users manage their own collection" on public.collection_sync;
create policy "Users manage their own collection"
  on public.collection_sync
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on table public.collection_sync from anon, authenticated;
grant select, insert, update, delete on table public.collection_sync to authenticated;

create or replace function public.touch_collection_sync_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists collection_sync_updated_at on public.collection_sync;
create trigger collection_sync_updated_at
  before update on public.collection_sync
  for each row execute function public.touch_collection_sync_updated_at();

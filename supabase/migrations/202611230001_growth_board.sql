-- Run in the Supabase SQL Editor. This is the live schema; the older
-- docs/skills-tracker-schema.sql is an unimplemented relational design.
begin;

create table if not exists public.growth_boards (
  user_id uuid primary key references auth.users(id) on delete cascade,
  board jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  constraint valid_board check (
    jsonb_typeof(board) = 'object'
    and board ?& array['version', 'skills', 'sessions', 'activeTimer', 'reminderDismissedAt']
    and board->>'version' = '1'
    and jsonb_typeof(board->'skills') = 'array'
    and jsonb_typeof(board->'sessions') = 'array'
    and octet_length(board::text) <= 5242880
  )
);
alter table public.growth_boards enable row level security;
revoke all on public.growth_boards from anon, authenticated;
grant select on public.growth_boards to authenticated;
drop policy if exists "Read own board" on public.growth_boards;
create policy "Read own board" on public.growth_boards for select to authenticated
  using ((select auth.uid()) = user_id);

-- All writes use this RPC, which derives ownership from the verified JWT.
-- A revision check prevents stale tabs/devices from overwriting newer work.
create or replace function public.save_growth_board(board_data jsonb, expected_revision bigint, board_owner uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  current_revision bigint;
begin
  if owner_id is null or board_owner is null or owner_id <> board_owner then
    raise exception 'Sign in to save your board' using errcode = '42501';
  end if;
  if expected_revision is null or expected_revision < 0 then
    raise exception 'Invalid revision' using errcode = '22023';
  end if;
  -- Also serializes first-time inserts when no row exists yet.
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text, 0));
  select revision into current_revision from public.growth_boards where user_id = owner_id for update;
  if coalesce(current_revision, 0) <> expected_revision then
    raise exception 'Your board changed in another tab or device. Reload the board and try again.' using errcode = '40001';
  end if;
  insert into public.growth_boards(user_id, board, revision)
    values(owner_id, board_data, 1)
  on conflict (user_id) do update set board = excluded.board,
    revision = growth_boards.revision + 1, updated_at = now()
  returning revision into current_revision;
  return current_revision;
end;
$$;
revoke all on function public.save_growth_board(jsonb, bigint, uuid) from public, anon;
grant execute on function public.save_growth_board(jsonb, bigint, uuid) to authenticated;
commit;

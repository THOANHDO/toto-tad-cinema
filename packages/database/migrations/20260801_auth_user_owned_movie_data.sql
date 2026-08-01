-- Replace legacy Netflix-style viewing-profile ownership with Supabase Auth
-- account ownership. Existing sr_profiles rows are retained only so historical
-- foreign keys remain valid; the application no longer reads or writes them.

alter table public.sr_favorites
  add column if not exists user_id uuid references public.user_accounts(user_id) on delete cascade;

alter table public.sr_watch_history
  add column if not exists user_id uuid references public.user_accounts(user_id) on delete cascade;

alter table public.sr_favorites
  alter column user_id set default auth.uid(),
  alter column profile_id drop not null;

alter table public.sr_watch_history
  alter column user_id set default auth.uid(),
  alter column profile_id drop not null;

-- A viewing profile has no reliable relationship to an Auth account. Preserve
-- ambiguous legacy rows instead of assigning one person's private data to
-- another. A single-account installation is unambiguous and can be backfilled.
do $$
declare
  account_count bigint;
  only_account_id uuid;
begin
  select count(*) into account_count from public.user_accounts;

  if account_count = 1 then
    select user_id into only_account_id from public.user_accounts limit 1;

    update public.sr_favorites as favorites
    set user_id = only_account_id
    where favorites.id in (
      select distinct on (movie_slug) id
      from public.sr_favorites
      where user_id is null
      order by movie_slug, created_at desc, id
    );

    update public.sr_watch_history as history
    set user_id = only_account_id
    where history.id in (
      select distinct on (movie_slug) id
      from public.sr_watch_history
      where user_id is null
      order by movie_slug, updated_at desc, id
    );
  end if;
end;
$$;

-- Make the migration recoverable if an earlier attempt backfilled duplicate
-- movie slugs before the unique indexes were created. Keep the newest row
-- owned and preserve the other legacy rows without exposing them through RLS.
with ranked_favorites as (
  select
    id,
    row_number() over (
      partition by user_id, movie_slug
      order by created_at desc, id
    ) as duplicate_rank
  from public.sr_favorites
  where user_id is not null
)
update public.sr_favorites as favorites
set user_id = null
from ranked_favorites
where favorites.id = ranked_favorites.id
  and ranked_favorites.duplicate_rank > 1;

with ranked_history as (
  select
    id,
    row_number() over (
      partition by user_id, movie_slug
      order by updated_at desc, id
    ) as duplicate_rank
  from public.sr_watch_history
  where user_id is not null
)
update public.sr_watch_history as history
set user_id = null
from ranked_history
where history.id = ranked_history.id
  and ranked_history.duplicate_rank > 1;

-- New application writes are unique per authenticated account. PostgreSQL
-- allows multiple NULL values here, so unresolved legacy rows remain intact.
alter table public.sr_favorites
  drop constraint if exists sr_favorites_profile_id_movie_slug_key;

alter table public.sr_watch_history
  drop constraint if exists sr_watch_history_profile_id_movie_slug_key;

create unique index if not exists sr_favorites_user_id_movie_slug_key
  on public.sr_favorites (user_id, movie_slug);

create unique index if not exists sr_watch_history_user_id_movie_slug_key
  on public.sr_watch_history (user_id, movie_slug);

create index if not exists sr_favorites_user_id_created_at_idx
  on public.sr_favorites (user_id, created_at desc);

create index if not exists sr_watch_history_user_id_updated_at_idx
  on public.sr_watch_history (user_id, updated_at desc);

comment on column public.sr_favorites.user_id is
  'Supabase Auth account that owns this private favorite.';
comment on column public.sr_watch_history.user_id is
  'Supabase Auth account that owns this private watch-history row.';
comment on table public.sr_profiles is
  'Legacy viewing profiles retained for historical data only; unused by the application.';

alter table public.sr_profiles enable row level security;
alter table public.sr_favorites enable row level security;
alter table public.sr_watch_history enable row level security;

-- Remove the previous private-auth policies: they allowed every active account
-- to access every viewing profile and therefore every dependent data row.
drop policy if exists "active_accounts_manage_viewing_profiles" on public.sr_profiles;
drop policy if exists "active_accounts_manage_favorites" on public.sr_favorites;
drop policy if exists "active_accounts_manage_watch_history" on public.sr_watch_history;

drop policy if exists "account_owns_favorites" on public.sr_favorites;
create policy "account_owns_favorites"
on public.sr_favorites
for all
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_account()
)
with check (
  user_id = auth.uid()
  and public.is_active_account()
);

drop policy if exists "account_owns_watch_history" on public.sr_watch_history;
create policy "account_owns_watch_history"
on public.sr_watch_history
for all
to authenticated
using (
  user_id = auth.uid()
  and public.is_active_account()
)
with check (
  user_id = auth.uid()
  and public.is_active_account()
);

-- No application role may access legacy viewing profiles. The service role
-- continues to bypass RLS for explicit administrative/migration work.
revoke all on table public.sr_profiles from public, anon, authenticated;

revoke all on table public.sr_favorites from public, anon, authenticated;
revoke all on table public.sr_watch_history from public, anon, authenticated;
grant select, insert, update, delete on table public.sr_favorites to authenticated;
grant select, insert, update, delete on table public.sr_watch_history to authenticated;

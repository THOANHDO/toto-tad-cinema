-- Private invite-only authentication and authorization.
--
-- `sr_profiles` remains a Netflix-style viewing profile table. Auth identities
-- are intentionally stored separately in `user_accounts` so existing viewing
-- profiles, favorites, and watch history keep their current meaning and data.

create table if not exists public.user_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_accounts_role_check check (role in ('admin', 'member'))
);

comment on table public.user_accounts is
  'Authorization records for Supabase Auth users; separate from sr_profiles viewing profiles.';
comment on column public.user_accounts.role is
  'Managed by an administrator or service-role process only.';
comment on column public.user_accounts.is_active is
  'When false, the user is denied access even if their Supabase Auth session is valid.';

-- Keep account timestamps consistent without allowing members to update the row.
create or replace function public.set_user_account_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_account_updated_at on public.user_accounts;
create trigger set_user_account_updated_at
before update on public.user_accounts
for each row execute function public.set_user_account_updated_at();

-- Backfill users that may already exist before this migration is applied.
-- Every account starts as a member; admin must be granted explicitly.
insert into public.user_accounts (
  user_id,
  email,
  display_name,
  role,
  is_active,
  created_at,
  updated_at
)
select
  users.id,
  lower(users.email),
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    split_part(users.email, '@', 1)
  ),
  'member',
  true,
  coalesce(users.created_at, now()),
  now()
from auth.users as users
where users.email is not null
on conflict (user_id) do nothing;

-- Auth trigger for users created by the Supabase Dashboard or Admin API.
-- Role metadata is deliberately ignored: clients must never be able to mint an
-- admin account through user_metadata.
create or replace function public.handle_new_private_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    insert into public.user_accounts (
      user_id,
      email,
      display_name,
      role,
      is_active
    )
    values (
      new.id,
      lower(new.email),
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(new.email, '@', 1)
      ),
      'member',
      true
    )
    on conflict (user_id) do nothing;
  exception
    when others then
      -- Account provisioning should never make auth.users creation fail.
      -- A missing account still fails closed in the application guard and can
      -- be repaired by an administrator.
      raise warning 'Could not provision user_accounts row for auth user %', new.id;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_private_account on auth.users;
create trigger on_auth_user_created_private_account
after insert on auth.users
for each row execute function public.handle_new_private_user();

revoke all on function public.handle_new_private_user() from public, anon, authenticated;
revoke all on function public.set_user_account_updated_at() from public, anon, authenticated;

-- SECURITY DEFINER helpers avoid recursive RLS checks on user_accounts. They
-- expose only a boolean and always evaluate the current authenticated user.
create or replace function public.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_accounts
    where user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function public.is_admin_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_accounts
    where user_id = auth.uid()
      and is_active = true
      and role = 'admin'
  );
$$;

revoke all on function public.is_active_account() from public, anon;
revoke all on function public.is_admin_account() from public, anon;
grant execute on function public.is_active_account() to authenticated;
grant execute on function public.is_admin_account() to authenticated;

alter table public.user_accounts enable row level security;

drop policy if exists "user_accounts_select_own_or_admin" on public.user_accounts;
create policy "user_accounts_select_own_or_admin"
on public.user_accounts
for select
to authenticated
using (user_id = auth.uid() or public.is_admin_account());

drop policy if exists "user_accounts_admin_insert" on public.user_accounts;
create policy "user_accounts_admin_insert"
on public.user_accounts
for insert
to authenticated
with check (public.is_admin_account());

drop policy if exists "user_accounts_admin_update" on public.user_accounts;
create policy "user_accounts_admin_update"
on public.user_accounts
for update
to authenticated
using (public.is_admin_account())
with check (public.is_admin_account());

drop policy if exists "user_accounts_admin_delete" on public.user_accounts;
create policy "user_accounts_admin_delete"
on public.user_accounts
for delete
to authenticated
using (public.is_admin_account());

revoke all on table public.user_accounts from anon;
grant select, insert, update, delete on table public.user_accounts to authenticated;

-- The original migration disabled RLS for local/no-auth usage. Private mode is
-- fail-closed: only authenticated users with an active authorization record can
-- access shared viewing profiles and their dependent data. Existing rows remain
-- untouched, preserving favorites and history.
alter table public.sr_profiles enable row level security;
alter table public.sr_favorites enable row level security;
alter table public.sr_watch_history enable row level security;

drop policy if exists "active_accounts_manage_viewing_profiles" on public.sr_profiles;
create policy "active_accounts_manage_viewing_profiles"
on public.sr_profiles
for all
to authenticated
using (public.is_active_account())
with check (public.is_active_account());

drop policy if exists "active_accounts_manage_favorites" on public.sr_favorites;
create policy "active_accounts_manage_favorites"
on public.sr_favorites
for all
to authenticated
using (public.is_active_account())
with check (public.is_active_account());

drop policy if exists "active_accounts_manage_watch_history" on public.sr_watch_history;
create policy "active_accounts_manage_watch_history"
on public.sr_watch_history
for all
to authenticated
using (public.is_active_account())
with check (public.is_active_account());

revoke all on table public.sr_profiles from anon;
revoke all on table public.sr_favorites from anon;
revoke all on table public.sr_watch_history from anon;

grant select, insert, update, delete on table public.sr_profiles to authenticated;
grant select, insert, update, delete on table public.sr_favorites to authenticated;
grant select, insert, update, delete on table public.sr_watch_history to authenticated;

-- The application already reads/writes this field; add it defensively for
-- databases created from the original migration where it was omitted.
alter table public.sr_watch_history
  add column if not exists poster_url text;

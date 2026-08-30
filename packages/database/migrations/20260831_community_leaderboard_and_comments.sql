-- Create comments table and policies for family/friends community
create table if not exists public.sr_comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.user_accounts(user_id) on delete cascade not null default auth.uid(),
  movie_slug text not null,
  movie_title text not null,
  poster_url text,
  episode_name text,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists sr_comments_movie_slug_idx on public.sr_comments (movie_slug, created_at desc);
create index if not exists sr_comments_created_at_idx on public.sr_comments (created_at desc);

alter table public.sr_comments enable row level security;

-- Policies for sr_comments
drop policy if exists "active_accounts_view_comments" on public.sr_comments;
create policy "active_accounts_view_comments"
on public.sr_comments
for select
to authenticated
using (public.is_active_account());

drop policy if exists "active_accounts_insert_comments" on public.sr_comments;
create policy "active_accounts_insert_comments"
on public.sr_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_account()
);

drop policy if exists "users_delete_own_comments" on public.sr_comments;
create policy "users_delete_own_comments"
on public.sr_comments
for delete
to authenticated
using (
  (user_id = auth.uid() or public.is_admin())
  and public.is_active_account()
);

grant select, insert, delete on table public.sr_comments to authenticated;

-- Allow active authenticated accounts to read all favorites to compute leaderboard rankings
drop policy if exists "active_accounts_read_all_favorites" on public.sr_favorites;
create policy "active_accounts_read_all_favorites"
on public.sr_favorites
for select
to authenticated
using (public.is_active_account());

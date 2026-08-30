-- Drop legacy NOT NULL constraints on sr_favorites and sr_watch_history
do $$
begin
  -- sr_favorites
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sr_favorites' and column_name = 'canonical_movie_id') then
    alter table public.sr_favorites alter column canonical_movie_id drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sr_favorites' and column_name = 'profile_id') then
    alter table public.sr_favorites alter column profile_id drop not null;
  end if;

  -- sr_watch_history
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sr_watch_history' and column_name = 'canonical_movie_id') then
    alter table public.sr_watch_history alter column canonical_movie_id drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'sr_watch_history' and column_name = 'profile_id') then
    alter table public.sr_watch_history alter column profile_id drop not null;
  end if;
end $$;

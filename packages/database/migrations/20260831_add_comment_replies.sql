-- Add parent_id to sr_comments for threaded replies / replies to comments
alter table public.sr_comments
  add column if not exists parent_id uuid references public.sr_comments(id) on delete cascade;

create index if not exists sr_comments_parent_id_idx on public.sr_comments (parent_id);

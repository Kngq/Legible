-- Feed photos (src/app/api/photos/route.ts). Run once in the Supabase SQL editor
-- or with `supabase db push`. The bucket named by SUPABASE_PHOTO_BUCKET must
-- already exist and allow public reads; uploads use the service role key.

-- One photo per feed item. item_key is the timeline key: c:<civic id> or d:<document id>.
create table if not exists public.item_photos (
  item_key    text primary key,
  url         text not null,          -- our Supabase Storage public URL, never Pixabay's
  alt         text not null,
  contributor text not null,          -- Pixabay user name, shown in the credit
  source_url  text not null,          -- Pixabay page for the photo, linked from the credit
  pixabay_id  bigint not null,
  fetched_at  timestamptz not null default now()
);

-- Pixabay search responses, reused for 24 hours as their terms require.
create table if not exists public.photo_search_cache (
  query      text primary key,
  hits       jsonb not null,
  fetched_at timestamptz not null default now()
);

-- The route reads and writes with the service role, which bypasses RLS.
-- Nothing else gets access to either table.
alter table public.item_photos enable row level security;
alter table public.photo_search_cache enable row level security;

-- blackgirl: initial schema
-- Each visitor gets an anonymous Supabase user (no login). Row-level security
-- makes every scan and photo visible only to the user who created it.

-- ---------------------------------------------------------------------------
-- Scans
-- ---------------------------------------------------------------------------
create table if not exists public.scans (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),

  -- Path inside the private "scan-photos" bucket: <user_id>/<scan_id>.jpg
  -- Null once the user deletes the photo (scores can be kept for trends).
  photo_path    text,

  -- YouCam Skin Analysis, normalised: [{ concern, rawScore, uiScore }]
  concerns      jsonb not null,
  overall       numeric(5, 2),
  skin_age      smallint,
  skin_type     jsonb,          -- { whole, t_zone, u_zone }

  -- Capture quality / tone context (YouCam Skin Tone + Fitzpatrick analysis)
  face_quality  jsonb,          -- { lighting, frontal, area, faceangle }
  skin_tone_hex text,
  fitzpatrick   text check (fitzpatrick in ('I','II','III','IV','V','VI')),

  analysis_source text not null default 'live' check (analysis_source in ('live', 'cache')),
  note          text check (char_length(note) <= 500)
);

create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;

drop policy if exists "scans: owner can read" on public.scans;
create policy "scans: owner can read" on public.scans
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "scans: owner can insert" on public.scans;
create policy "scans: owner can insert" on public.scans
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "scans: owner can update" on public.scans;
create policy "scans: owner can update" on public.scans
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "scans: owner can delete" on public.scans;
create policy "scans: owner can delete" on public.scans
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Private photo bucket (before/after comparison)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('scan-photos', 'scan-photos', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Files live under a folder named after the owner's user id.
drop policy if exists "scan-photos: owner can read" on storage.objects;
create policy "scan-photos: owner can read" on storage.objects
  for select to authenticated
  using (bucket_id = 'scan-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "scan-photos: owner can upload" on storage.objects;
create policy "scan-photos: owner can upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'scan-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "scan-photos: owner can delete" on storage.objects;
create policy "scan-photos: owner can delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'scan-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

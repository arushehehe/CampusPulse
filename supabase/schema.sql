create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists pg_cron with schema extensions;

create table if not exists public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email_domain text unique not null,
  created_at timestamptz not null default now()
);

insert into public.colleges (name, email_domain)
values ('IIT Guwahati', 'iitg.ac.in')
on conflict (email_domain) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique not null,
  full_name text,
  avatar_url text,
  college_id uuid references public.colleges (id) on delete set null,
  role text not null default 'student' check (role in ('student', 'organizer', 'admin')),
  is_attendance_public boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text,
  category text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  poster_url text,
  source_url text,
  source_type text not null default 'community'
    check (source_type in ('official', 'organizer', 'community')),
  status text not null default 'pending'
    check (status in ('draft', 'pending', 'approved', 'rejected', 'published')),
  organizer_profile_id uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id) on delete cascade,
  is_paid boolean not null default false,
  price numeric(10,2),
  capacity integer check (capacity is null or capacity > 0),
  star_count integer not null default 0 check (star_count >= 0),
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists college_id uuid references public.colleges (id) on delete set null;
alter table public.events add column if not exists source_url text;
alter table public.events add column if not exists is_paid boolean not null default false;
alter table public.events add column if not exists price numeric(10,2);
alter table public.events add column if not exists capacity integer check (capacity is null or capacity > 0);
alter table public.events add column if not exists star_count integer not null default 0 check (star_count >= 0);
alter table public.events add column if not exists view_count integer not null default 0 check (view_count >= 0);
alter table public.events add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(location, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
  ) stored;

create index if not exists events_search_vector_idx on public.events using gin (search_vector);
create index if not exists events_start_time_idx on public.events (start_time);
create index if not exists events_status_source_idx on public.events (status, source_type);

create table if not exists public.event_embeddings (
  event_id uuid primary key references public.events (id) on delete cascade,
  embedding vector(1536) not null,
  content_hash text not null,
  embedded_at timestamptz not null default now()
);

create index if not exists event_embeddings_embedding_idx
on public.event_embeddings
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

create table if not exists public.embedding_jobs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('event', 'event_ingestion', 'scraped_raw')),
  entity_id uuid not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);

create table if not exists public.event_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  recurrence_rule text not null,
  organizer_profile_id uuid references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('going', 'interested', 'not_going')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.event_moderation_actions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  moderator_id uuid not null references public.profiles (id) on delete cascade,
  from_status text check (from_status in ('draft', 'pending', 'approved', 'rejected', 'published')),
  to_status text not null check (to_status in ('draft', 'pending', 'approved', 'rejected', 'published')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.event_ingestions (
  id uuid primary key default gen_random_uuid(),
  source_type text not null
    check (source_type in ('link', 'poster', 'link_and_poster', 'notes')),
  source_url text,
  poster_url text,
  notes text,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'processing', 'extracted', 'failed', 'dismissed')),
  extraction_error text,
  extracted_event_id uuid references public.events (id) on delete set null,
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_url is not null or poster_url is not null or notes is not null)
);

create table if not exists public.event_stars (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.organizer_follows (
  id uuid primary key default gen_random_uuid(),
  organizer_profile_id uuid not null references public.profiles (id) on delete cascade,
  follower_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (organizer_profile_id, follower_id),
  check (organizer_profile_id <> follower_id)
);

create table if not exists public.event_reports (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  notes text,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, reporter_id, reason)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade,
  type text not null check (type in ('followed_organizer_event', 'rsvp_reminder', 'moderation_update')),
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.scraping_sources (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('official_site', 'notice_board', 'club_page', 'instagram')),
  handle_or_url text not null,
  college_id uuid references public.colleges (id) on delete cascade,
  active boolean not null default true,
  last_scraped_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (type, handle_or_url)
);

create table if not exists public.scraped_raw (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.scraping_sources (id) on delete cascade,
  raw_content text,
  raw_url text,
  poster_url text,
  processed boolean not null default false,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  check (raw_content is not null or raw_url is not null or poster_url is not null)
);

create table if not exists public.scraping_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.scraping_sources (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  scheduled_for timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists scraping_jobs_one_pending_per_source_idx
on public.scraping_jobs (source_id)
where status in ('pending', 'processing');

insert into storage.buckets (id, name, public)
values ('event-posters', 'event-posters', true)
on conflict (id) do update set public = excluded.public;

alter table public.profiles enable row level security;
alter table public.colleges enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;
alter table public.event_moderation_actions enable row level security;
alter table public.event_ingestions enable row level security;
alter table public.event_stars enable row level security;
alter table public.organizer_follows enable row level security;
alter table public.event_reports enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.scraping_sources enable row level security;
alter table public.scraped_raw enable row level security;
alter table public.event_series enable row level security;
alter table public.event_embeddings enable row level security;
alter table public.embedding_jobs enable row level security;
alter table public.scraping_jobs enable row level security;

drop policy if exists "colleges_select_authenticated" on public.colleges;
drop policy if exists "profiles_select_own_or_public_email_domain" on public.profiles;
drop policy if exists "profiles_insert_own_row" on public.profiles;
drop policy if exists "profiles_update_own_row" on public.profiles;
drop policy if exists "profiles_update_own_privacy" on public.profiles;
drop policy if exists "events_select_published" on public.events;
drop policy if exists "events_insert_authenticated" on public.events;
drop policy if exists "events_update_owner_or_admin" on public.events;
drop policy if exists "rsvps_select_authenticated" on public.rsvps;
drop policy if exists "rsvps_insert_own" on public.rsvps;
drop policy if exists "rsvps_update_own" on public.rsvps;
drop policy if exists "moderation_actions_select_admin_or_event_owner" on public.event_moderation_actions;
drop policy if exists "moderation_actions_insert_admin" on public.event_moderation_actions;
drop policy if exists "event_ingestions_select_submitter_or_admin" on public.event_ingestions;
drop policy if exists "event_ingestions_insert_own" on public.event_ingestions;
drop policy if exists "event_ingestions_update_admin" on public.event_ingestions;
drop policy if exists "event_stars_select_authenticated" on public.event_stars;
drop policy if exists "event_stars_insert_own" on public.event_stars;
drop policy if exists "event_stars_delete_own" on public.event_stars;
drop policy if exists "organizer_follows_select_authenticated" on public.organizer_follows;
drop policy if exists "organizer_follows_insert_own" on public.organizer_follows;
drop policy if exists "organizer_follows_delete_own" on public.organizer_follows;
drop policy if exists "event_reports_insert_own" on public.event_reports;
drop policy if exists "event_reports_select_reporter_or_admin" on public.event_reports;
drop policy if exists "event_reports_update_admin" on public.event_reports;
drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_admin" on public.notifications;
drop policy if exists "notifications_insert_privileged" on public.notifications;
drop policy if exists "push_subscriptions_select_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
drop policy if exists "scraping_sources_select_admin" on public.scraping_sources;
drop policy if exists "scraping_sources_write_admin" on public.scraping_sources;
drop policy if exists "scraped_raw_select_admin" on public.scraped_raw;
drop policy if exists "scraped_raw_write_admin" on public.scraped_raw;
drop policy if exists "event_embeddings_select_authenticated" on public.event_embeddings;
drop policy if exists "event_embeddings_write_admin" on public.event_embeddings;
drop policy if exists "embedding_jobs_select_admin" on public.embedding_jobs;
drop policy if exists "embedding_jobs_write_admin" on public.embedding_jobs;
drop policy if exists "scraping_jobs_select_admin" on public.scraping_jobs;
drop policy if exists "scraping_jobs_write_admin" on public.scraping_jobs;
drop policy if exists "event_series_select_authenticated" on public.event_series;
drop policy if exists "event_series_write_owner_or_admin" on public.event_series;
drop policy if exists "event_posters_select_public" on storage.objects;
drop policy if exists "event_posters_insert_own_folder" on storage.objects;

create policy "colleges_select_authenticated"
on public.colleges
for select
to authenticated
using (true);

create policy "profiles_select_own_or_public_email_domain"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own_row"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own_privacy"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (
    select existing.role
    from public.profiles as existing
    where existing.id = auth.uid()
  )
);

create policy "events_select_published"
on public.events
for select
to authenticated
using (
  status = 'published'
  or created_by = auth.uid()
  or organizer_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "events_insert_authenticated"
on public.events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    (
      status in ('draft', 'pending')
      and source_type = 'community'
      and organizer_profile_id is null
    )
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('organizer', 'admin')
        and (events.organizer_profile_id is null or events.organizer_profile_id = auth.uid())
    )
    or (
      source_type = 'community'
      and status = 'pending'
      and organizer_profile_id is null
      and exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
      )
    )
  )
);

create policy "events_update_owner_or_admin"
on public.events
for update
to authenticated
using (
  (
    created_by = auth.uid()
    and source_type = 'community'
    and status in ('draft', 'pending', 'rejected')
  )
  or (
    organizer_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('organizer', 'admin')
    )
  )
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  (
    created_by = auth.uid()
    and source_type = 'community'
    and status in ('draft', 'pending', 'rejected')
  )
  or (
    organizer_profile_id = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('organizer', 'admin')
    )
  )
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "rsvps_select_authenticated"
on public.rsvps
for select
to authenticated
using (true);

create policy "rsvps_insert_own"
on public.rsvps
for insert
to authenticated
with check (user_id = auth.uid());

create policy "rsvps_update_own"
on public.rsvps
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "moderation_actions_select_admin_or_event_owner"
on public.event_moderation_actions
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
  or exists (
    select 1
    from public.events
    where events.id = event_moderation_actions.event_id
      and events.created_by = auth.uid()
  )
);

create policy "moderation_actions_insert_admin"
on public.event_moderation_actions
for insert
to authenticated
with check (
  moderator_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "event_ingestions_select_submitter_or_admin"
on public.event_ingestions
for select
to authenticated
using (
  submitted_by = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "event_ingestions_insert_own"
on public.event_ingestions
for insert
to authenticated
with check (submitted_by = auth.uid());

create policy "event_ingestions_update_admin"
on public.event_ingestions
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  reviewed_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "event_stars_select_authenticated"
on public.event_stars
for select
to authenticated
using (true);

create policy "event_stars_insert_own"
on public.event_stars
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.events
    where events.id = event_stars.event_id
      and events.source_type = 'community'
      and events.status in ('pending', 'published')
  )
);

create policy "event_stars_delete_own"
on public.event_stars
for delete
to authenticated
using (user_id = auth.uid());

create policy "organizer_follows_select_authenticated"
on public.organizer_follows
for select
to authenticated
using (true);

create policy "organizer_follows_insert_own"
on public.organizer_follows
for insert
to authenticated
with check (
  follower_id = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = organizer_follows.organizer_profile_id
      and profiles.role in ('organizer', 'admin')
  )
);

create policy "organizer_follows_delete_own"
on public.organizer_follows
for delete
to authenticated
using (follower_id = auth.uid());

create policy "event_reports_insert_own"
on public.event_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

create policy "event_reports_select_reporter_or_admin"
on public.event_reports
for select
to authenticated
using (
  reporter_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "event_reports_update_admin"
on public.event_reports
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  reviewed_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "notifications_select_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "notifications_insert_privileged"
on public.notifications
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('organizer', 'admin')
  )
);

create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

create policy "scraping_sources_select_admin"
on public.scraping_sources
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "scraping_sources_write_admin"
on public.scraping_sources
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "scraped_raw_select_admin"
on public.scraped_raw
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "scraped_raw_write_admin"
on public.scraped_raw
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "event_embeddings_select_authenticated"
on public.event_embeddings
for select
to authenticated
using (
  exists (
    select 1
    from public.events
    where events.id = event_embeddings.event_id
      and (
        events.status = 'published'
        or events.created_by = auth.uid()
        or events.organizer_profile_id = auth.uid()
        or exists (
          select 1
          from public.profiles
          where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
      )
  )
);

create policy "event_embeddings_write_admin"
on public.event_embeddings
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "embedding_jobs_select_admin"
on public.embedding_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "embedding_jobs_write_admin"
on public.embedding_jobs
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "scraping_jobs_select_admin"
on public.scraping_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "scraping_jobs_write_admin"
on public.scraping_jobs
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create policy "event_series_select_authenticated"
on public.event_series
for select
to authenticated
using (true);

create policy "event_series_write_owner_or_admin"
on public.event_series
for all
to authenticated
using (
  created_by = auth.uid()
  or organizer_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  created_by = auth.uid()
  or organizer_profile_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create or replace function public.sync_event_star_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.events
    set star_count = star_count + 1,
        status = case
          when source_type = 'community' and status = 'pending' and star_count + 1 >= 25
          then 'published'
          else status
        end
    where id = new.event_id;
    return new;
  end if;

  if tg_op = 'DELETE' then
    update public.events
    set star_count = greatest(star_count - 1, 0)
    where id = old.event_id;
    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists event_stars_sync_count on public.event_stars;
create trigger event_stars_sync_count
after insert or delete on public.event_stars
for each row execute function public.sync_event_star_count();

create or replace function public.increment_event_view_count(event_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.events
  set view_count = view_count + 1
  where id = event_id
    and status = 'published';
$$;

create or replace function public.queue_event_embedding_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.embedding_jobs (entity_type, entity_id, status, attempts, error, updated_at)
  values ('event', new.id, 'pending', 0, null, now())
  on conflict (entity_type, entity_id)
  do update set
    status = 'pending',
    attempts = 0,
    error = null,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists events_queue_embedding_job on public.events;
create trigger events_queue_embedding_job
after insert or update of title, description, location, category, start_time, end_time
on public.events
for each row execute function public.queue_event_embedding_job();

create or replace function public.match_events(
  query_embedding vector(1536),
  match_count integer default 12,
  min_similarity double precision default 0.72
)
returns table (
  id uuid,
  title text,
  description text,
  location text,
  category text,
  start_time timestamptz,
  end_time timestamptz,
  poster_url text,
  source_url text,
  source_type text,
  status text,
  organizer_profile_id uuid,
  created_by uuid,
  is_paid boolean,
  price numeric,
  capacity integer,
  star_count integer,
  view_count integer,
  created_at timestamptz,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.id,
    events.title,
    events.description,
    events.location,
    events.category,
    events.start_time,
    events.end_time,
    events.poster_url,
    events.source_url,
    events.source_type,
    events.status,
    events.organizer_profile_id,
    events.created_by,
    events.is_paid,
    events.price,
    events.capacity,
    events.star_count,
    events.view_count,
    events.created_at,
    1 - (event_embeddings.embedding <=> query_embedding) as similarity
  from public.event_embeddings
  join public.events on events.id = event_embeddings.event_id
  where events.status = 'published'
    and 1 - (event_embeddings.embedding <=> query_embedding) >= min_similarity
  order by event_embeddings.embedding <=> query_embedding
  limit least(match_count, 50);
$$;

create or replace function public.find_duplicate_event_candidates(
  query_embedding vector(1536),
  match_count integer default 8,
  min_similarity double precision default 0.88
)
returns table (
  event_id uuid,
  title text,
  start_time timestamptz,
  location text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.id as event_id,
    events.title,
    events.start_time,
    events.location,
    1 - (event_embeddings.embedding <=> query_embedding) as similarity
  from public.event_embeddings
  join public.events on events.id = event_embeddings.event_id
  where events.status in ('pending', 'published')
    and 1 - (event_embeddings.embedding <=> query_embedding) >= min_similarity
  order by event_embeddings.embedding <=> query_embedding
  limit least(match_count, 25);
$$;

create or replace function public.enqueue_due_scraping_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer;
begin
  insert into public.scraping_jobs (source_id, scheduled_for)
  select scraping_sources.id, now()
  from public.scraping_sources
  where scraping_sources.active = true
    and (
      scraping_sources.last_scraped_at is null
      or scraping_sources.last_scraped_at <= now() - interval '6 hours'
    )
    and not exists (
      select 1
      from public.scraping_jobs
      where scraping_jobs.source_id = scraping_sources.id
        and scraping_jobs.status in ('pending', 'processing')
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

select cron.unschedule('campuspulse-enqueue-scraping-jobs')
where exists (
  select 1
  from cron.job
  where jobname = 'campuspulse-enqueue-scraping-jobs'
);

select cron.schedule(
  'campuspulse-enqueue-scraping-jobs',
  '0 */6 * * *',
  $$select public.enqueue_due_scraping_jobs();$$
);

create policy "event_posters_select_public"
on storage.objects
for select
to public
using (bucket_id = 'event-posters');

create policy "event_posters_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'event-posters'
  and (storage.foldername(name))[1] = auth.uid()::text
);

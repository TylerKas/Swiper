-- ========= BASE EXTENSIONS =========
create extension if not exists "pgcrypto";

-- ========= PROFILES =========
-- Existing schema uses profiles(id uuid pk, user_id uuid unique). We add/align columns and policies.
alter table public.profiles enable row level security;

alter table public.profiles
  add column if not exists role text check (role in ('student','elder')),
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists city text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists verification_status text default 'unverified';

-- Policies: select own and update own based on user_id linkage, plus open select if intended
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and polname='profiles_select_all'
  ) then
    execute 'create policy profiles_select_all on public.profiles for select using (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='public' and tablename='profiles' and polname='profiles_update_own'
  ) then
    execute 'create policy profiles_update_own on public.profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id)';
  end if;
end$$;

-- ========= TASKS =========
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer check (price_cents >= 0),
  city text,
  lat double precision,
  lng double precision,
  tags text[],
  status text not null default 'available' check (status in ('available','matched','in_progress','completed','cancelled')),
  photos jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists idx_tasks_status_created on public.tasks(status, created_at desc);
create index if not exists idx_tasks_elder on public.tasks(elder_id);
alter table public.tasks enable row level security;

-- Tasks policies:
do $$
begin
  -- Students can see available tasks; elders see their own; matched students also see their matched tasks.
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and polname='tasks_select_visible'
  ) then
    execute $p$
      create policy tasks_select_visible on public.tasks for select
      using (
        status = 'available'
        or auth.uid() in (
          select user_id from public.profiles p where p.id = elder_id
        )
        or exists (
          select 1 from public.matches m
          where m.task_id = id and exists (
            select 1 from public.profiles p where p.id = m.student_id and p.user_id = auth.uid()
          )
        )
      )
    $p$;
  end if;

  -- Elders can insert tasks they own (auth user linked to elder profile)
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and polname='tasks_insert_elder_owned'
  ) then
    execute $p$
      create policy tasks_insert_elder_owned on public.tasks for insert
      with check (
        exists (
          select 1 from public.profiles p where p.id = elder_id and p.user_id = auth.uid() and p.user_type = 'elder'
        )
      )
    $p$;
  end if;

  -- Elders can update their own tasks
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and polname='tasks_update_elder_owned'
  ) then
    execute $p$
      create policy tasks_update_elder_owned on public.tasks for update
      using (
        exists (select 1 from public.profiles p where p.id = elder_id and p.user_id = auth.uid())
      )
      with check (
        exists (select 1 from public.profiles p where p.id = elder_id and p.user_id = auth.uid())
      )
    $p$;
  end if;

  -- Matched student can move status forward (e.g., in_progress/completed) but nothing else.
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='tasks' and polname='tasks_update_status_by_matched_student'
  ) then
    execute $p$
      create policy tasks_update_status_by_matched_student on public.tasks for update
      using (
        exists (
          select 1 from public.matches m
          where m.task_id = id
            and exists (select 1 from public.profiles p where p.id = m.student_id and p.user_id = auth.uid())
            and m.status in ('active','pending')
        )
      )
      with check (status in ('in_progress','completed'))
    $p$;
  end if;
end$$;

-- ========= MATCHES =========
-- Drop conflicting columns/policies if older schema exists (keep table)
do $$
begin
  if exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='matches' and column_name='elder_id'
  ) then
    -- keep elder_id column; newer flow derives elder from task.elder_id
    -- no action; we will ignore elder_id usage in policies
    null;
  end if;
end$$;

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','active','declined','cancelled','completed')),
  elder_accepted boolean not null default false,
  student_accepted boolean not null default true,
  created_at timestamptz not null default now(),
  unique(task_id, student_id)
);
create index if not exists idx_matches_task on public.matches(task_id);
create index if not exists idx_matches_student on public.matches(student_id);
alter table public.matches enable row level security;

-- Match policies:
do $$
begin
  -- Visibility: either the student or the elder (owner of the task) can see the match
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='matches' and polname='matches_select_visible'
  ) then
    execute $p$
      create policy matches_select_visible on public.matches for select
      using (
        exists(
          select 1 from public.profiles p where p.id = matches.student_id and p.user_id = auth.uid()
        )
        or exists(
          select 1 from public.tasks t
          join public.profiles pe on pe.id = t.elder_id
          where t.id = matches.task_id and pe.user_id = auth.uid()
        )
      )
    $p$;
  end if;

  -- Students create interest (swipe right)
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='matches' and polname='matches_insert_student'
  ) then
    execute $p$
      create policy matches_insert_student on public.matches for insert
      with check (
        exists (select 1 from public.profiles p where p.id = student_id and p.user_id = auth.uid() and p.user_type='student')
      )
    $p$;
  end if;

  -- Students may update/cancel their own pending match
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='matches' and polname='matches_update_student'
  ) then
    execute $p$
      create policy matches_update_student on public.matches for update
      using (exists (select 1 from public.profiles p where p.id = student_id and p.user_id = auth.uid()))
      with check (exists (select 1 from public.profiles p where p.id = student_id and p.user_id = auth.uid()))
    $p$;
  end if;

  -- Elders can accept if they own the task
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='matches' and polname='matches_update_elder_accept'
  ) then
    execute $p$
      create policy matches_update_elder_accept on public.matches for update
      using (
        exists (
          select 1 from public.tasks t join public.profiles pe on pe.id = t.elder_id
          where t.id = matches.task_id and pe.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.tasks t join public.profiles pe on pe.id = t.elder_id
          where t.id = matches.task_id and pe.user_id = auth.uid()
        )
      )
    $p$;
  end if;
end$$;

-- ========= DISMISSALS (swipe left memory) =========
create table if not exists public.dismissals (
  student_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, task_id)
);
alter table public.dismissals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='dismissals' and polname='dismissals_select_own'
  ) then
    execute 'create policy dismissals_select_own on public.dismissals for select using (exists (select 1 from public.profiles p where p.id = student_id and p.user_id = auth.uid()))';
  end if;
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='dismissals' and polname='dismissals_insert_own'
  ) then
    execute 'create policy dismissals_insert_own on public.dismissals for insert with check (exists (select 1 from public.profiles p where p.id = student_id and p.user_id = auth.uid()))';
  end if;
end$$;

-- ========= MESSAGES =========
-- Ensure required columns exist; adapt to existing schema
do $$
begin
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='attachments'
  ) then
    alter table public.messages add column attachments jsonb default '[]'::jsonb;
  end if;
  if not exists (
    select 1 from information_schema.columns where table_schema='public' and table_name='messages' and column_name='match_id'
  ) then
    alter table public.messages add column match_id uuid;
  end if;
end$$;

create index if not exists idx_messages_match_created on public.messages(match_id, created_at);
alter table public.messages enable row level security;

do $$
begin
  -- Only participants can read messages
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and polname='messages_select_participants'
  ) then
    execute $p$
      create policy messages_select_participants on public.messages for select
      using (
        exists (
          select 1 from public.matches m
          where m.id = messages.match_id
            and (
              exists (select 1 from public.profiles p where p.id = m.student_id and p.user_id = auth.uid())
              or exists (
                select 1 from public.tasks t join public.profiles pe on pe.id = t.elder_id
                where t.id = m.task_id and pe.user_id = auth.uid()
              )
            )
        )
      )
    $p$;
  end if;

  -- Only participants can send, and sender must be auth user
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='messages' and polname='messages_insert_participants'
  ) then
    execute $p$
      create policy messages_insert_participants on public.messages for insert
      with check (
        exists (
          select 1 from public.matches m
          where m.id = messages.match_id
            and (
              exists (select 1 from public.profiles p where p.id = messages.sender_id and p.user_id = auth.uid() and p.id = m.student_id)
              or exists (
                select 1 from public.tasks t join public.profiles pe on pe.id = t.elder_id
                where t.id = m.task_id and pe.user_id = auth.uid() and pe.id = messages.sender_id
              )
            )
        )
      )
    $p$;
  end if;
end$$;

-- ========= RATINGS =========
create table if not exists public.ratings (
  id bigserial primary key,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  score int not null check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (from_id, task_id)
);
alter table public.ratings enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='ratings' and polname='ratings_select_visible'
  ) then
    execute 'create policy ratings_select_visible on public.ratings for select using (true)';
  end if;

  -- Anyone can only rate from their own account
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='ratings' and polname='ratings_insert_own'
  ) then
    execute 'create policy ratings_insert_own on public.ratings for insert with check (exists (select 1 from public.profiles p where p.id = from_id and p.user_id = auth.uid()))';
  end if;
end$$;

-- ========= COMPLETED TASKS =========
create table if not exists public.completed_tasks (
  id bigserial primary key,
  task_id uuid not null references public.tasks(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  completed_by uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  paid_cents integer check (paid_cents >= 0)
);
alter table public.completed_tasks enable row level security;

do $$
begin
  -- Visible to either participant
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='completed_tasks' and polname='completed_tasks_select_visible'
  ) then
    execute $p$
      create policy completed_tasks_select_visible on public.completed_tasks for select
      using (
        exists (
          select 1 from public.matches m
          where m.id = completed_tasks.match_id
            and (
              exists (select 1 from public.profiles p where p.id = m.student_id and p.user_id = auth.uid())
              or exists (
                select 1 from public.tasks t join public.profiles pe on pe.id = t.elder_id
                where t.id = m.task_id and pe.user_id = auth.uid()
              )
            )
        )
      )
    $p$;
  end if;

  -- Only participants can insert a completion record for their match
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='completed_tasks' and polname='completed_tasks_insert_participants'
  ) then
    execute $p$
      create policy completed_tasks_insert_participants on public.completed_tasks for insert
      with check (
        exists (
          select 1 from public.matches m
          where m.id = completed_tasks.match_id
            and (
              exists (select 1 from public.profiles p where p.id = completed_tasks.completed_by and p.user_id = auth.uid() and p.id = m.student_id)
              or exists (
                select 1 from public.tasks t join public.profiles pe on pe.id = t.elder_id
                where t.id = m.task_id and pe.user_id = auth.uid() and pe.id = completed_tasks.completed_by
              )
            )
        )
      )
    $p$;
  end if;
end$$;

-- ========= RPCs (for clean client calls) =========

-- Feed for students: available tasks, not dismissed, not already matched by me
create or replace function public.rpc_get_swipe_feed(limit_rows int default 20)
returns setof public.tasks
language sql
stable
as $$
  select t.*
  from public.tasks t
  where t.status = 'available'
    and exists (
      select 1 from public.profiles p where p.id = t.elder_id and p.user_id <> auth.uid()
    )
    and not exists (
      select 1 from public.matches m
      join public.profiles p on p.id = m.student_id
      where m.task_id = t.id and p.user_id = auth.uid()
    )
    and not exists (
      select 1 from public.dismissals d
      join public.profiles p on p.id = d.student_id
      where d.task_id = t.id and p.user_id = auth.uid()
    )
  order by t.created_at desc
  limit limit_rows;
$$;

-- Swipe left (remember dismissal)
create or replace function public.rpc_swipe_left(p_task_id uuid)
returns void
language sql
security invoker
as $$
  insert into public.dismissals (student_id, task_id)
  select p.id, p_task_id from public.profiles p where p.user_id = auth.uid()
  on conflict (student_id, task_id) do nothing;
$$;

-- Swipe right (express interest → pending match)
create or replace function public.rpc_swipe_right(p_task_id uuid)
returns uuid
language plpgsql
as $$
declare v_match_id uuid; v_student_id uuid;
begin
  select id into v_student_id from public.profiles where user_id = auth.uid();
  insert into public.matches (task_id, student_id, status, elder_accepted, student_accepted)
  values (p_task_id, v_student_id, 'pending', false, true)
  on conflict (task_id, student_id) do update
    set student_accepted = true
  returning id into v_match_id;

  return v_match_id;
end;
$$;

-- Elder accepts a student; also updates the task to 'matched'
create or replace function public.rpc_elder_accept(p_match_id uuid)
returns void
language plpgsql
as $$
declare v_task_id uuid; v_elder_profile_id uuid;
begin
  select t.id, t.elder_id into v_task_id, v_elder_profile_id
  from public.tasks t
  join public.matches m on m.task_id = t.id
  where m.id = p_match_id;

  -- ensure the caller is the elder for this task
  if not exists (
    select 1 from public.profiles pe where pe.id = v_elder_profile_id and pe.user_id = auth.uid()
  ) then
    raise exception 'not authorized';
  end if;

  update public.matches m
    set status='active', elder_accepted=true
  where m.id = p_match_id;

  update public.tasks
     set status='matched'
   where id = v_task_id;
end;
$$;

-- Mark completed (by either participant) and optionally record payment
create or replace function public.rpc_mark_completed(p_match_id uuid, p_paid_cents integer default null)
returns void
language plpgsql
as $$
declare v_task_id uuid; v_student_id uuid; v_elder_id uuid; v_caller_profile_id uuid;
begin
  select m.task_id, m.student_id, t.elder_id into v_task_id, v_student_id, v_elder_id
  from public.matches m join public.tasks t on t.id = m.task_id
  where m.id = p_match_id;

  select id into v_caller_profile_id from public.profiles where user_id = auth.uid();
  if v_caller_profile_id is null or (v_caller_profile_id <> v_student_id and v_caller_profile_id <> v_elder_id) then
    raise exception 'not authorized';
  end if;

  insert into public.completed_tasks (task_id, match_id, completed_by, paid_cents)
  values (v_task_id, p_match_id, v_caller_profile_id, p_paid_cents);

  update public.matches set status='completed' where id = p_match_id;
  update public.tasks   set status='completed' where id = v_task_id;
end;
$$;


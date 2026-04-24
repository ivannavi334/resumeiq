-- Users profile table, linked 1:1 to auth.users
create table public.users (
  id           uuid        primary key references auth.users(id) on delete cascade,
  email        text        not null,
  plan         text        not null default 'free' check (plan in ('free', 'pro')),
  analyses_count integer   not null default 0,
  created_at   timestamptz not null default now()
);

alter table public.users enable row level security;

-- Users may only read their own row
create policy "users: select own"
  on public.users for select
  using (auth.uid() = id);

-- Users may only update their own row (plan changes handled server-side only)
create policy "users: update own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-insert a profile row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

# Step 2: Database Schema + Row-Level Security (Supabase / Postgres)

**Goal by the end of this step:** All core tables created in Supabase, with Row-Level Security (RLS) locking down who can read/write what.

Run everything below in **Supabase Dashboard → SQL Editor**.

---

## 2.1 Enable required extension

```sql
create extension if not exists "pgcrypto"; -- for gen_random_uuid()
```

---

## 2.2 `profiles` table

Extends `auth.users` (which Supabase manages automatically) with public-facing fields.

```sql
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
```

Then add the trigger from Step 1.12 so a profile row is auto-created on signup:

```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 2.3 `agents` table

Your catalog of agents. Publicly readable (anyone can browse), but only editable by you (admin), typically through the Supabase dashboard directly or a service-role-only admin route.

```sql
create table agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category text check (category in ('ai', 'utility')),
  is_premium boolean default false,
  price_inr integer default 0,        -- monthly price in paise (₹99 = 9900)
  docker_image text,                  -- e.g. registry/agent-summarizer:latest
  runtime_url text,                   -- internal URL/port where container is reachable
  input_schema jsonb,
  output_schema jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

alter table agents enable row level security;

create policy "Anyone can view active agents"
  on agents for select
  using (active = true);

-- No insert/update/delete policy for regular users —
-- only the service_role key (used server-side by you) can write to this table.
```

---

## 2.4 `subscriptions` table

Tracks which user has paid access to which premium agent.

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  razorpay_subscription_id text unique,
  status text check (status in ('created', 'active', 'past_due', 'cancelled')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  unique (user_id, agent_id)
);

alter table subscriptions enable row level security;

create policy "Users can view their own subscriptions"
  on subscriptions for select
  using (auth.uid() = user_id);

-- Inserts/updates to this table happen only via your backend
-- using the service_role key (e.g. from the Razorpay webhook handler),
-- so no insert/update policy is granted to regular users.
```

---

## 2.5 `usage_logs` table

Tracks every agent call — useful for rate limiting, analytics, and debugging.

```sql
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  agent_id uuid references agents(id) on delete cascade,
  request_payload jsonb,
  response_status text,
  duration_ms integer,
  created_at timestamptz default now()
);

alter table usage_logs enable row level security;

create policy "Users can view their own usage logs"
  on usage_logs for select
  using (auth.uid() = user_id);

-- Inserts happen server-side via service_role after each agent call.
```

---

## 2.6 Helpful indexes

```sql
create index idx_subscriptions_user_agent on subscriptions(user_id, agent_id);
create index idx_usage_logs_user on usage_logs(user_id, created_at desc);
create index idx_agents_slug on agents(slug);
```

---

## 2.7 Seed a couple of test agents

```sql
insert into agents (name, slug, description, category, is_premium, price_inr, docker_image)
values
  ('Text Summarizer', 'text-summarizer', 'Summarizes long text into key points.', 'ai', false, 0, 'yourrepo/agent-summarizer:latest'),
  ('SMS Sender', 'sms-sender', 'Sends an SMS via a third-party SMS API.', 'utility', true, 9900, 'yourrepo/agent-sms-sender:latest');
```

---

## 2.8 Why RLS matters here

- The **anon/browser key** (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) is subject to RLS — a logged-in user can only ever see their own `subscriptions` and `usage_logs` rows, even if someone inspects your frontend network calls.
- The **service_role key** bypasses RLS entirely — only ever use it in server-side code (API routes, webhook handlers), never in the browser.
- This means even if your frontend has a bug, a user can't read another user's subscription status or usage history directly from Supabase.

---

## Checklist before moving to Step 3
- [ ] `profiles`, `agents`, `subscriptions`, `usage_logs` tables created
- [ ] RLS enabled on all four tables
- [ ] Trigger auto-creates a profile row on signup
- [ ] Test agents seeded so you have something to display in Step 3
- [ ] Confirmed (via Supabase dashboard → Authentication → a test user) that querying `subscriptions` with the anon key only returns that user's own rows

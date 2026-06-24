-- ====================================================================
-- SUPABASE DATABASE SETUP SCHEMA
-- App: AI-Review Pro (Code Review Streak & Gamification Dashboard)
-- Target Workspace: Supabase PostgreSQL Real-time Server
-- ====================================================================

-- Enable UUID extension for cryptographic keys
create extension if not exists "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. Create table definitions
-- --------------------------------------------------------------------

-- Tables: users
-- References Supabase auth.users directly. When a user deletes their account,
-- their profile record is also automatically cascaded.
create table if not exists public.users (
    id uuid references auth.users on delete cascade primary key,
    github_username text not null,
    email text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tables: reviews
-- Holds code snippet analyze logs, performance rating scores, and structural JSON comments.
create table if not exists public.reviews (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null,
    language text not null,
    code_snippet text not null,
    overall_score integer not null check (overall_score >= 0 and overall_score <= 100),
    bug_score integer not null check (bug_score >= 0 and bug_score <= 100),
    security_score integer not null check (security_score >= 0 and security_score <= 100),
    readability_score integer not null check (readability_score >= 0 and readability_score <= 100),
    complexity_score integer not null check (complexity_score >= 0 and complexity_score <= 100),
    feedback jsonb not null default '{}'::jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tables: streaks
-- Tracks chronological activity streaks. unique constraint on user_id ensures 
-- only one tracker profile per active client.
create table if not exists public.streaks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references public.users(id) on delete cascade not null unique,
    current_streak integer default 0 not null check (current_streak >= 0),
    longest_streak integer default 0 not null check (longest_streak >= 0),
    last_reviewed_at timestamp with time zone
);

-- --------------------------------------------------------------------
-- 2. Enable Row Level Security (RLS)
-- --------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.reviews enable row level security;
alter table public.streaks enable row level security;

-- --------------------------------------------------------------------
-- 3. Configure Security access policies (RLS)
-- --------------------------------------------------------------------

-- Policies: users
create policy "Allow authenticated users to read their own profile"
    on public.users for select
    using (auth.uid() = id);

create policy "Allow authenticated users to insert their own profile"
    on public.users for insert
    with check (auth.uid() = id);

create policy "Allow authenticated users to update their own profile"
    on public.users for update
    using (auth.uid() = id);

-- Policies: reviews
create policy "Allow authenticated users to select their own reviews"
    on public.reviews for select
    using (auth.uid() = user_id);

create policy "Allow authenticated users to insert their own reviews"
    on public.reviews for insert
    with check (auth.uid() = user_id);

create policy "Allow authenticated users to update their own reviews"
    on public.reviews for update
    using (auth.uid() = user_id);

create policy "Allow authenticated users to delete their own reviews"
    on public.reviews for delete
    using (auth.uid() = user_id);

-- Policies: streaks
create policy "Allow authenticated users to select their own streak"
    on public.streaks for select
    using (auth.uid() = user_id);

create policy "Allow authenticated users to initialize their own streak"
    on public.streaks for insert
    with check (auth.uid() = user_id);

create policy "Allow authenticated users to update their own streak"
    on public.streaks for update
    using (auth.uid() = user_id);

-- --------------------------------------------------------------------
-- 4. Automated Auth Synchronization Trigger
-- This function triggers on a new developer signing up via GitHub OAuth.
-- It maps the metadata payload details directly into 'public.users' 
-- and initializes their streak.
-- --------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
    parsed_username text;
begin
    -- Extract Preferred GitHub User Name from different possible Supabase metadata keys
    parsed_username := coalesce(
        new.raw_user_meta_data->>'preferred_username', 
        new.raw_user_meta_data->>'user_name', 
        new.raw_user_meta_data->>'name',
        'github_user_' || substring(new.id::text from 1 for 6)
    );

    -- Insert into public.users
    insert into public.users (id, github_username, email, created_at)
    values (
        new.id,
        parsed_username,
        coalesce(new.email, 'no-email@github.com'),
        now()
    )
    on conflict (id) do update 
    set github_username = excluded.github_username,
        email = excluded.email;
        
    -- Initialize user's streaks records
    insert into public.streaks (user_id, current_streak, longest_streak)
    values (new.id, 0, 0)
    on conflict (user_id) do nothing;

    return new;
end;
$$ language plpgsql security definer;

-- Bind trigger to auth.users insertion
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_auth_user();

-- ====================================================================
-- GITHUB OAUTH SETUP INSTRUCTIONS FOR SUPABASE
-- ====================================================================
-- 1. Create a GitHub OAuth application:
--    Go to GitHub -> Settings -> Developer Settings -> OAuth Apps -> New OAuth App
-- 2. Configure the Auth URLs:
--    - Homepage URL: https://<supabase-project-ref>.supabase.co
--    - Authorization Callback URL: https://<supabase-project-ref>.supabase.co/auth/v1/callback
-- 3. Obtain Credentials:
--    - Copy Key "Client ID"
--    - Generate and copy "Client Secret"
-- 4. Configure Supabase Auth:
--    - Go to Supabase Dashboard -> Auth -> Providers -> GitHub
--    - Enable the provider toggle
--    - Paste your Application "Client ID" and "Client Secret"
--    - Click Save!
-- ====================================================================

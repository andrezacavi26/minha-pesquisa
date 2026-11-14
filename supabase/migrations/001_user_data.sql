-- Minha Pesquisa: um documento por usuário com todos os dados do painel.
-- Cada pessoa só lê e grava os próprios dados (Row Level Security).

create table if not exists public.user_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

drop policy if exists "ler os próprios dados" on public.user_data;
create policy "ler os próprios dados" on public.user_data
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "inserir os próprios dados" on public.user_data;
create policy "inserir os próprios dados" on public.user_data
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "atualizar os próprios dados" on public.user_data;
create policy "atualizar os próprios dados" on public.user_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "apagar os próprios dados" on public.user_data;
create policy "apagar os próprios dados" on public.user_data
  for delete to authenticated using ((select auth.uid()) = user_id);

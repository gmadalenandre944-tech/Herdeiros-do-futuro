-- =====================================================================
-- Herdeiros do Futuro — Histórico de mini pautas (como os boletins).
-- Executar no SQL Editor do Supabase (o projeto usa Supabase externo).
-- Pode repetir-se sem estragar dados existentes.
-- =====================================================================

create table if not exists public.mini_pautas_historico (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  professor_id uuid default auth.uid(),
  classe text not null,
  turma text,
  disciplina text not null,
  trimestre text not null,
  notas jsonb not null default '{}'::jsonb,
  media_turma numeric,
  ano_letivo text
);

grant select, insert, update, delete on public.mini_pautas_historico to authenticated;
grant all on public.mini_pautas_historico to service_role;

alter table public.mini_pautas_historico enable row level security;

-- Secretaria/Admin: acesso total; professor: apenas o que ele próprio guardou.
drop policy if exists mpa_staff_all on public.mini_pautas_historico;
drop policy if exists mpa_owner_all on public.mini_pautas_historico;

create policy mpa_staff_all on public.mini_pautas_historico
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy mpa_owner_all on public.mini_pautas_historico
  for all to authenticated
  using (professor_id = auth.uid() and public.has_role('professor'::public.app_role, auth.uid()))
  with check (professor_id = auth.uid() and public.has_role('professor'::public.app_role, auth.uid()));

create index if not exists idx_mini_pautas_historico_professor
  on public.mini_pautas_historico (professor_id, created_at desc);

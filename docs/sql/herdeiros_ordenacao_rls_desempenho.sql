-- =====================================================================
-- Herdeiros do Futuro — Ordenação A-Z, isolamento por professor (RLS)
-- e desempenho. Executar no SQL Editor do Supabase (pode repetir-se).
-- =====================================================================

-- 0. Funções auxiliares (SECURITY DEFINER evita recursão de RLS)
create or replace function public.professor_lecciona_turma(_turma_id anyelement)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.professor_disciplinas pd
    where pd.professor_id = auth.uid()
      and pd.turma_id::text = _turma_id::text
  )
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.has_role('admin'::public.app_role, auth.uid())
      or public.has_role('secretario'::public.app_role, auth.uid())
$$;

grant execute on function public.is_staff() to authenticated;

-- 1. ÍNDICES
create index if not exists idx_matriculas_classe_nome
  on public.matriculas (classe, lower(nome_completo));
create index if not exists idx_matriculas_turma on public.matriculas (turma_id);
create index if not exists idx_professor_disciplinas_professor
  on public.professor_disciplinas (professor_id, turma_id);

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='matriculas' and column_name='professor_id') then
    execute 'create index if not exists idx_matriculas_professor on public.matriculas (professor_id)';
  end if;
end $$;

-- 2. RLS em MATRÍCULAS
--    Secretaria/Admin: acesso total. Professor: apenas alunos das suas turmas.
alter table public.matriculas enable row level security;
grant select, insert, update, delete on public.matriculas to authenticated;
grant all on public.matriculas to service_role;

drop policy if exists "Professores acedem apenas aos seus alunos" on public.matriculas;
drop policy if exists matriculas_staff_all on public.matriculas;
drop policy if exists matriculas_professor_select on public.matriculas;

create policy matriculas_staff_all on public.matriculas
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='matriculas' and column_name='professor_id') then
    execute $p$create policy matriculas_professor_select on public.matriculas
      for select to authenticated
      using (professor_id = auth.uid() or public.professor_lecciona_turma(turma_id))$p$;
  else
    execute $p$create policy matriculas_professor_select on public.matriculas
      for select to authenticated
      using (public.professor_lecciona_turma(turma_id))$p$;
  end if;
end $$;

-- 3. RLS em TURMAS e PROFESSOR_DISCIPLINAS
do $$ begin
  if to_regclass('public.turmas') is not null then
    execute 'alter table public.turmas enable row level security';
    execute 'drop policy if exists turmas_staff_all on public.turmas';
    execute 'drop policy if exists turmas_professor_select on public.turmas';
    execute 'create policy turmas_staff_all on public.turmas for all to authenticated using (public.is_staff()) with check (public.is_staff())';
    execute 'create policy turmas_professor_select on public.turmas for select to authenticated using (public.professor_lecciona_turma(id))';
  end if;
end $$;

alter table public.professor_disciplinas enable row level security;
drop policy if exists pd_staff_all on public.professor_disciplinas;
drop policy if exists pd_own_select on public.professor_disciplinas;
create policy pd_staff_all on public.professor_disciplinas
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy pd_own_select on public.professor_disciplinas
  for select to authenticated using (professor_id = auth.uid());

-- 4. Pautas, boletins, frequências, sumários e histórico de notas:
--    cada professor vê/edita/elimina APENAS o que ele próprio criou.
--    Substitui as políticas antigas "prof_all_*" (que davam acesso a todos).
do $$ declare t text; begin
  foreach t in array array['boletins','mini_pautas','frequencias','sumarios','notas_historico'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I add column if not exists professor_id uuid default auth.uid()', t);
      execute format('create index if not exists %I on public.%I (professor_id)', 'idx_'||t||'_professor', t);
      execute format('alter table public.%I enable row level security', t);
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
      execute format('drop policy if exists "prof_all_%s" on public.%I', t, t);
      execute format('drop policy if exists %I on public.%I', t||'_staff_select', t);
      execute format('drop policy if exists %I on public.%I', t||'_staff_insert', t);
      execute format('drop policy if exists %I on public.%I', t||'_staff_update', t);
      execute format('drop policy if exists %I on public.%I', t||'_staff_delete', t);
      execute format('drop policy if exists %I on public.%I', t||'_owner_all', t);
      execute format('drop policy if exists %I on public.%I', t||'_admin_all', t);
      execute format($p$create policy %I on public.%I for all to authenticated
        using (public.is_staff()) with check (public.is_staff())$p$, t||'_admin_all', t);
      execute format($p$create policy %I on public.%I for all to authenticated
        using (professor_id = auth.uid() and public.has_role('professor'::public.app_role, auth.uid()))
        with check (professor_id = auth.uid() and public.has_role('professor'::public.app_role, auth.uid()))$p$,
        t||'_owner_all', t);
    end if;
  end loop;
end $$;

-- 5. VIEWS: ORDER BY classe, LOWER(nome_completo) ASC
--    security_invoker = true obriga a vista a respeitar o RLS acima.
do $$ declare v text; def text; begin
  foreach v in array array['vw_alunos_ordenados','vw_alunos_2026_2027'] loop
    if to_regclass('public.'||v) is not null
       and exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=v and column_name='nome_completo')
       and exists (select 1 from information_schema.columns
                   where table_schema='public' and table_name=v and column_name='classe') then
      def := rtrim(pg_get_viewdef(('public.'||v)::regclass, true), '; ');
      if def !~* 'order by\s+classe,\s*lower\(nome_completo\)' then
        execute format('create or replace view public.%I as select * from (%s) o order by classe, lower(nome_completo) asc', v, def);
      end if;
      execute format('alter view public.%I set (security_invoker = true)', v);
      execute format('grant select on public.%I to authenticated', v);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

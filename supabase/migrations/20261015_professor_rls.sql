-- Permissões para o Painel do Professor (correr no SQL Editor)
do $$ declare t text; begin
  foreach t in array array['boletins','mini_pautas','frequencias','sumarios'] loop
    if to_regclass('public.'||t) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format('grant all on public.%I to service_role', t);
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists "prof_all_%s" on public.%I', t, t);
      execute format($p$create policy "prof_all_%s" on public.%I for all to authenticated
        using (public.has_role('professor'::public.app_role, auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))
        with check (public.has_role('professor'::public.app_role, auth.uid()) or public.has_role('admin'::public.app_role, auth.uid()))$p$, t, t);
    end if;
  end loop;
end $$;
grant select on public.vw_alunos_ordenados to authenticated;

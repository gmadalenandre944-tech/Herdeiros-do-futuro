-- Data de nascimento do aluno (tipo DATE) em matrículas, confirmações e nas vistas de alunos.
alter table public.matriculas   add column if not exists data_nascimento date;
alter table public.confirmacoes add column if not exists data_nascimento date;

-- Se a coluna já existia como texto, converte para DATE (valores inválidos ficam vazios).
do $$
declare t text;
begin
  foreach t in array array['matriculas','confirmacoes'] loop
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name=t and column_name='data_nascimento' and data_type <> 'date') then
      execute format($f$alter table public.%I alter column data_nascimento type date
        using case when data_nascimento::text ~ '^\d{4}-\d{2}-\d{2}' then left(data_nascimento::text,10)::date else null end$f$, t);
    end if;
  end loop;
end $$;

-- Acrescenta data_nascimento às vistas que ainda não a têm (mantém a definição actual).
do $$
declare v text; def text;
begin
  foreach v in array array['vw_alunos_ordenados','vw_alunos_2026_2027'] loop
    if to_regclass('public.'||v) is not null and not exists (
      select 1 from information_schema.columns where table_schema='public' and table_name=v and column_name='data_nascimento') then
      def := rtrim(pg_get_viewdef(('public.'||v)::regclass, true), E'; \n');
      execute format('create or replace view public.%I as select v.*, m.data_nascimento from (%s) v left join public.matriculas m on m.id = v.id', v, def);
      execute format('grant select on public.%I to authenticated', v);
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';

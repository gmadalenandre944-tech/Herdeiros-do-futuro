-- Grava automaticamente cada conta de professor/secretário criada no registo,
-- mesmo quando a confirmação de e-mail está ligada (sem sessão no navegador).
-- Executar no SQL Editor do Supabase.

create unique index if not exists professores_user_id_key on public.professores(user_id);
create unique index if not exists staff_profiles_user_id_key on public.staff_profiles(user_id);

create or replace function public.handle_new_staff_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data->>'role', '');
begin
  if v_role in ('professor', 'secretario') then
    insert into public.staff_profiles (user_id, role, status, nome, email, telefone, especialidade)
    values (new.id, v_role, 'activo', new.raw_user_meta_data->>'nome', new.email,
            new.raw_user_meta_data->>'telefone', new.raw_user_meta_data->>'especialidade')
    on conflict (user_id) do nothing;
  end if;
  if v_role = 'professor' then
    insert into public.professores (user_id, nome, email, telefone, especialidade)
    values (new.id, new.raw_user_meta_data->>'nome', new.email,
            new.raw_user_meta_data->>'telefone', new.raw_user_meta_data->>'especialidade')
    on conflict (user_id) do nothing;
  end if;
  return new;
exception when others then
  -- Nunca bloquear o registo por causa desta cópia.
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_staff on auth.users;
create trigger on_auth_user_created_staff
  after insert on auth.users
  for each row execute function public.handle_new_staff_user();

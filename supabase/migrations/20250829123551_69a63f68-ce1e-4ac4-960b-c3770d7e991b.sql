
-- 1) Garantir nomes únicos de hábitos por usuário (case-insensitive)
create unique index if not exists habit_definitions_user_name_idx
on public.habit_definitions (user_id, lower(name));

-- 2) Função para inserir/atualizar sessão por NOME do hábito
create or replace function public.upsert_habit_session_by_name(
  habit_name text,
  session_date date,
  sessions_completed integer,
  time_spent_minutes integer
)
returns public.habit_sessions
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit_id uuid;
  v_row public.habit_sessions;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select hd.id
    into v_habit_id
  from public.habit_definitions hd
  where hd.user_id = v_user_id
    and lower(hd.name) = lower(habit_name)
  limit 1;

  if v_habit_id is null then
    raise exception 'Habit "%" not found for current user', habit_name;
  end if;

  insert into public.habit_sessions (id, user_id, habit_id, date, sessions_completed, time_spent_minutes)
  values (gen_random_uuid(), v_user_id, v_habit_id, session_date, coalesce(sessions_completed, 0), coalesce(time_spent_minutes, 0))
  on conflict (habit_id, date) do update
    set sessions_completed = excluded.sessions_completed,
        time_spent_minutes = excluded.time_spent_minutes,
        updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

-- Permitir execução para usuários autenticados
grant execute on function public.upsert_habit_session_by_name(text, date, integer, integer) to authenticated;

-- 3) View para visualizar sessões com nomes de hábitos
create or replace view public.habit_sessions_with_names as
select
  s.id,
  s.user_id,
  s.habit_id,
  d.name as habit_name,
  s.date,
  s.sessions_completed,
  s.time_spent_minutes,
  s.created_at,
  s.updated_at
from public.habit_sessions s
join public.habit_definitions d
  on d.id = s.habit_id;

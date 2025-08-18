-- Fix function search path issue
create or replace function public.set_user_id()
returns trigger 
language plpgsql
set search_path = 'public'
as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;
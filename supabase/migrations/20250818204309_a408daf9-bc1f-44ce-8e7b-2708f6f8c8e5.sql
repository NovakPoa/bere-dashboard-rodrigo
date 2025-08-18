-- First add the column as nullable
alter table public.org_pages 
add column if not exists user_id uuid;

-- Then update all existing rows with a default user ID (auth.uid() won't work here)
-- Using the first user from auth.users if it exists, otherwise a random UUID
update public.org_pages 
set user_id = (
  select id from auth.users limit 1
) 
where user_id is null;

-- If no users exist, set a dummy UUID  
update public.org_pages 
set user_id = '00000000-0000-0000-0000-000000000000'
where user_id is null;

-- Now make it not null
alter table public.org_pages 
alter column user_id set not null;

-- Enable RLS
alter table public.org_pages enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view their own pages" on public.org_pages;
drop policy if exists "Users can insert their own pages" on public.org_pages;
drop policy if exists "Users can update their own pages" on public.org_pages;
drop policy if exists "Users can delete their own pages" on public.org_pages;

-- Create RLS policies for pages
create policy "Users can view their own pages"
  on public.org_pages for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pages"
  on public.org_pages for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pages"
  on public.org_pages for update
  using (auth.uid() = user_id);

create policy "Users can delete their own pages"
  on public.org_pages for delete
  using (auth.uid() = user_id);

-- Enable RLS for blocks
alter table public.org_blocks enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Users can view blocks of their own pages" on public.org_blocks;
drop policy if exists "Users can insert blocks into their own pages" on public.org_blocks;
drop policy if exists "Users can update blocks of their own pages" on public.org_blocks;
drop policy if exists "Users can delete blocks of their own pages" on public.org_blocks;

-- Create RLS policies for blocks tied to page ownership
create policy "Users can view blocks of their own pages"
  on public.org_blocks for select
  using (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

create policy "Users can insert blocks into their own pages"
  on public.org_blocks for insert
  with check (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

create policy "Users can update blocks of their own pages"
  on public.org_blocks for update
  using (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

create policy "Users can delete blocks of their own pages"
  on public.org_blocks for delete
  using (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

-- Function + trigger to set user_id automatically on insert
create or replace function public.set_user_id()
returns trigger language plpgsql as $$
begin
  if new.user_id is null then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists org_pages_set_user_id on public.org_pages;
create trigger org_pages_set_user_id
  before insert on public.org_pages
  for each row execute function public.set_user_id();
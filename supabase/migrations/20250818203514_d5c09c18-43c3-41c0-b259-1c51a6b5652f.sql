-- Create tables for Organização feature with secure RLS
-- Pages table
create table if not exists public.org_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  parent_id uuid null,
  title text not null default 'Nova página',
  is_favorite boolean not null default false,
  sort_index integer not null default 0,
  favorite_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Self reference for parent
alter table public.org_pages
  drop constraint if exists org_pages_parent_fk;
alter table public.org_pages
  add constraint org_pages_parent_fk foreign key (parent_id) references public.org_pages(id) on delete set null;

-- Enable RLS
alter table public.org_pages enable row level security;

-- Policies for pages
create policy if not exists "Users can view their own pages"
  on public.org_pages for select
  using (auth.uid() = user_id);

create policy if not exists "Users can insert their own pages"
  on public.org_pages for insert
  with check (auth.uid() = user_id);

create policy if not exists "Users can update their own pages"
  on public.org_pages for update
  using (auth.uid() = user_id);

create policy if not exists "Users can delete their own pages"
  on public.org_pages for delete
  using (auth.uid() = user_id);

-- Trigger to update updated_at
drop trigger if exists update_org_pages_updated_at on public.org_pages;
create trigger update_org_pages_updated_at
  before update on public.org_pages
  for each row execute function public.update_updated_at_column();

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

-- Blocks table
create table if not exists public.org_blocks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null,
  type text not null default 'text',
  content text,
  bold boolean not null default false,
  color text not null default 'default',
  order_index integer not null default 0,
  child_page_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FKs
alter table public.org_blocks
  drop constraint if exists org_blocks_page_fk;
alter table public.org_blocks
  add constraint org_blocks_page_fk foreign key (page_id) references public.org_pages(id) on delete cascade;

alter table public.org_blocks
  drop constraint if exists org_blocks_child_page_fk;
alter table public.org_blocks
  add constraint org_blocks_child_page_fk foreign key (child_page_id) references public.org_pages(id) on delete set null;

-- Enable RLS
alter table public.org_blocks enable row level security;

-- Policies for blocks tied to page ownership
create policy if not exists "Users can view blocks of their own pages"
  on public.org_blocks for select
  using (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

create policy if not exists "Users can insert blocks into their own pages"
  on public.org_blocks for insert
  with check (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

create policy if not exists "Users can update blocks of their own pages"
  on public.org_blocks for update
  using (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

create policy if not exists "Users can delete blocks of their own pages"
  on public.org_blocks for delete
  using (exists (
    select 1 from public.org_pages p
    where p.id = org_blocks.page_id and p.user_id = auth.uid()
  ));

-- Trigger to update updated_at
drop trigger if exists update_org_blocks_updated_at on public.org_blocks;
create trigger update_org_blocks_updated_at
  before update on public.org_blocks
  for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_org_pages_user_parent on public.org_pages(user_id, parent_id);
create index if not exists idx_org_pages_favorite on public.org_pages(user_id, is_favorite, favorite_order);
create index if not exists idx_org_blocks_page_order on public.org_blocks(page_id, order_index);


-- 1) Garantir bucket 'org-images' público (não falha se já existir)
insert into storage.buckets (id, name, public)
values ('org-images', 'org-images', true)
on conflict (id) do nothing;

-- 2) Políticas de leitura e upload anônimos no bucket org-images
-- Permitir que qualquer usuário (incluindo anon) LEIA arquivos de 'org-images'
create policy "Public can read org-images"
on storage.objects
for select
using (bucket_id = 'org-images');

-- Permitir que qualquer usuário (incluindo anon) FAÇA UPLOAD (INSERT) em 'org-images'
create policy "Anon can upload to org-images"
on storage.objects
for insert
with check (bucket_id = 'org-images');

-- Obs: Não estamos liberando UPDATE/DELETE para anon.
-- Usuários autenticados poderão atualizar/deletar seus próprios arquivos por outras políticas futuras, se necessário.

-- 3) Em org_pages: permitir uso anônimo, mas preencher user_id automaticamente quando houver login
alter table public.org_pages
  alter column user_id drop not null;

-- Criar um trigger para preencher user_id = auth.uid() quando inserido sem user_id (se houver sessão)
drop trigger if exists set_user_id_on_org_pages on public.org_pages;
create trigger set_user_id_on_org_pages
before insert on public.org_pages
for each row execute function public.set_user_id();

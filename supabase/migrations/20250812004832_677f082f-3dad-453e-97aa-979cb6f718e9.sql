-- Notion-like Organização schema
-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pages table (hierarchical)
CREATE TABLE IF NOT EXISTS public.org_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NULL REFERENCES public.org_pages(id) ON DELETE SET NULL,
  title text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Blocks table (content within a page)
-- type: 'title' | 'text' | 'page'
-- color: notion-like names: default, gray, brown, orange, yellow, green, blue, purple, pink, red
CREATE TABLE IF NOT EXISTS public.org_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.org_pages(id) ON DELETE CASCADE,
  type text NOT NULL,
  content text,
  bold boolean NOT NULL DEFAULT false,
  color text NOT NULL DEFAULT 'default',
  order_index integer NOT NULL DEFAULT 0,
  child_page_id uuid NULL REFERENCES public.org_pages(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_blocks_type_valid CHECK (type IN ('title','text','page'))
);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_org_pages_updated_at ON public.org_pages;
CREATE TRIGGER update_org_pages_updated_at
BEFORE UPDATE ON public.org_pages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_blocks_updated_at ON public.org_blocks;
CREATE TRIGGER update_org_blocks_updated_at
BEFORE UPDATE ON public.org_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_org_pages_parent ON public.org_pages(parent_id);
CREATE INDEX IF NOT EXISTS idx_org_blocks_page ON public.org_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_org_blocks_order ON public.org_blocks(page_id, order_index);

-- Enable Row Level Security
ALTER TABLE public.org_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_blocks ENABLE ROW LEVEL SECURITY;

-- Policies: allow full access for current anon frontend usage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_pages' AND policyname='Anon can select org_pages'
  ) THEN
    CREATE POLICY "Anon can select org_pages" ON public.org_pages FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_pages' AND policyname='Anon can insert org_pages'
  ) THEN
    CREATE POLICY "Anon can insert org_pages" ON public.org_pages FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_pages' AND policyname='Anon can update org_pages'
  ) THEN
    CREATE POLICY "Anon can update org_pages" ON public.org_pages FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_pages' AND policyname='Anon can delete org_pages'
  ) THEN
    CREATE POLICY "Anon can delete org_pages" ON public.org_pages FOR DELETE USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_blocks' AND policyname='Anon can select org_blocks'
  ) THEN
    CREATE POLICY "Anon can select org_blocks" ON public.org_blocks FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_blocks' AND policyname='Anon can insert org_blocks'
  ) THEN
    CREATE POLICY "Anon can insert org_blocks" ON public.org_blocks FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_blocks' AND policyname='Anon can update org_blocks'
  ) THEN
    CREATE POLICY "Anon can update org_blocks" ON public.org_blocks FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='org_blocks' AND policyname='Anon can delete org_blocks'
  ) THEN
    CREATE POLICY "Anon can delete org_blocks" ON public.org_blocks FOR DELETE USING (true);
  END IF;
END $$;
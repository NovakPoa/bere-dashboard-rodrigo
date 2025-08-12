-- Add ordering columns for pages and favorites
ALTER TABLE public.org_pages
ADD COLUMN IF NOT EXISTS sort_index integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS favorite_order integer NOT NULL DEFAULT 0;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_org_pages_parent_sort ON public.org_pages (parent_id, sort_index);
CREATE INDEX IF NOT EXISTS idx_org_pages_favorite_order ON public.org_pages (is_favorite, favorite_order);

-- Optional backfill: set initial sort_index grouped by parent by created_at
-- This gives a deterministic order for existing data
WITH ranked AS (
  SELECT id, parent_id, ROW_NUMBER() OVER (PARTITION BY parent_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.org_pages
)
UPDATE public.org_pages p
SET sort_index = r.rn * 100
FROM ranked r
WHERE p.id = r.id;

-- Optional backfill for favorites: order by created_at
WITH favs AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM public.org_pages
  WHERE is_favorite = true
)
UPDATE public.org_pages p
SET favorite_order = f.rn * 100
FROM favs f
WHERE p.id = f.id;
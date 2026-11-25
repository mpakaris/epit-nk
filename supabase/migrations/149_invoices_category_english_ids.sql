-- Migration 149: normalize invoices.category to language-neutral English IDs
-- Old rows stored Hungarian label strings; new code uses IDs translated in the UI.

-- 1. Migrate existing Hungarian values to English IDs
UPDATE public.invoices SET category = 'material'  WHERE category = 'Anyag';
UPDATE public.invoices SET category = 'labour'    WHERE category = 'Munka';
UPDATE public.invoices SET category = 'equipment' WHERE category = 'Szerszám/Eszköz';
UPDATE public.invoices SET category = 'delivery'  WHERE category = 'Szállítás';
UPDATE public.invoices SET category = 'other'     WHERE category IN ('Engedély/Hatóság', 'Egyéb');
UPDATE public.invoices SET category = 'delivery'  WHERE category = 'fuel';

-- 2. Replace old constraint with clean one
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_category_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_category_check
  CHECK (category = ANY (ARRAY['material', 'labour', 'equipment', 'delivery', 'parking', 'other']));

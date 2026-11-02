-- Add 'Munka' as a valid invoice category
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_category_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_category_check
  CHECK (category IN ('Anyag', 'Munka', 'Szerszám/Eszköz', 'Szállítás', 'Engedély/Hatóság', 'Egyéb'));

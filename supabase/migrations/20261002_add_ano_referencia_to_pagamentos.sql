-- Adds the billing/reference year separately from the actual receipt date.
-- Existing rows are intentionally left NULL; the app estimates their year
-- from data_pagamento and marks those legacy references with an asterisk.
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS ano_referencia integer;

COMMENT ON COLUMN public.pagamentos.ano_referencia IS
  'Year of the billing/reference period; data_pagamento remains the actual receipt date.';
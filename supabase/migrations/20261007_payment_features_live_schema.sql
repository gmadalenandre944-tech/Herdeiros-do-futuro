-- Completes optional payment fields used by the finance report and guardian
-- proof-upload screens. Core payments continue to use mes, valor_pago,
-- data_pagamento and ano_referencia.
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS multa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_movimento text,
  ADD COLUMN IF NOT EXISTS aluno_nome_manual text,
  ADD COLUMN IF NOT EXISTS comprovativo_url text,
  ADD COLUMN IF NOT EXISTS comprovativo_status text;

COMMENT ON COLUMN public.pagamentos.multa IS
  'Optional late fee amount; defaults to zero for existing and new payments.';
COMMENT ON COLUMN public.pagamentos.comprovativo_url IS
  'Supabase Storage path of a guardian-uploaded payment proof.';
COMMENT ON COLUMN public.pagamentos.comprovativo_status IS
  'Review state for a payment proof (for example, pendente, aprovado or rejeitado).';

NOTIFY pgrst, 'reload schema';

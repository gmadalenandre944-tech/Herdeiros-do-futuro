-- Adds the missing fields and tables required by the school screens.
-- This migration is additive: it does not delete or rewrite existing records.

ALTER TABLE public.mini_pautas
  ADD COLUMN IF NOT EXISTS ano_letivo integer,
  ADD COLUMN IF NOT EXISTS origem_local_id text;

-- Administrative final marks and imported legacy marks may not have component
-- scores. Keep the existing final mark while allowing those components to be null.
ALTER TABLE public.mini_pautas
  ALTER COLUMN av1 DROP NOT NULL,
  ALTER COLUMN av2 DROP NOT NULL,
  ALTER COLUMN pp DROP NOT NULL;

ALTER TABLE public.pagamentos_propinas
  ADD COLUMN IF NOT EXISTS ano_referencia integer,
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'propina';

ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS matricula_id integer
    REFERENCES public.matriculas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pagamentos_matricula_id_idx
  ON public.pagamentos (matricula_id)
  WHERE matricula_id IS NOT NULL;

ALTER TABLE public.pagamentos_propinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pagamentos_propinas_staff_select ON public.pagamentos_propinas;
CREATE POLICY pagamentos_propinas_staff_select
  ON public.pagamentos_propinas
  FOR SELECT TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

DROP POLICY IF EXISTS pagamentos_propinas_staff_insert ON public.pagamentos_propinas;
CREATE POLICY pagamentos_propinas_staff_insert
  ON public.pagamentos_propinas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

DROP POLICY IF EXISTS pagamentos_propinas_staff_update ON public.pagamentos_propinas;
CREATE POLICY pagamentos_propinas_staff_update
  ON public.pagamentos_propinas
  FOR UPDATE TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  )
  WITH CHECK (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

DROP POLICY IF EXISTS pagamentos_propinas_staff_delete ON public.pagamentos_propinas;
CREATE POLICY pagamentos_propinas_staff_delete
  ON public.pagamentos_propinas
  FOR DELETE TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

ALTER TABLE public.mini_pautas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mini_pautas_staff_select ON public.mini_pautas;
CREATE POLICY mini_pautas_staff_select
  ON public.mini_pautas
  FOR SELECT TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
    OR (
      public.has_role('professor'::public.app_role, auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.matriculas AS m
        JOIN public.professor_disciplinas AS pd ON pd.turma_id = m.turma_id
        JOIN public.disciplinas AS d ON d.id = pd.disciplina_id
        WHERE m.id = mini_pautas.aluno_id
          AND pd.professor_id = auth.uid()
          AND d.nome = mini_pautas.disciplina
      )
    )
  );

DROP POLICY IF EXISTS mini_pautas_staff_insert ON public.mini_pautas;
CREATE POLICY mini_pautas_staff_insert
  ON public.mini_pautas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
    OR (
      professor_id = auth.uid()
      AND public.has_role('professor'::public.app_role, auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.matriculas AS m
        JOIN public.professor_disciplinas AS pd ON pd.turma_id = m.turma_id
        JOIN public.disciplinas AS d ON d.id = pd.disciplina_id
        WHERE m.id = mini_pautas.aluno_id
          AND pd.professor_id = auth.uid()
          AND d.nome = mini_pautas.disciplina
      )
    )
  );

DROP POLICY IF EXISTS mini_pautas_staff_update ON public.mini_pautas;
CREATE POLICY mini_pautas_staff_update
  ON public.mini_pautas
  FOR UPDATE TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
    OR (
      public.has_role('professor'::public.app_role, auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.matriculas AS m
        JOIN public.professor_disciplinas AS pd ON pd.turma_id = m.turma_id
        JOIN public.disciplinas AS d ON d.id = pd.disciplina_id
        WHERE m.id = mini_pautas.aluno_id
          AND pd.professor_id = auth.uid()
          AND d.nome = mini_pautas.disciplina
      )
    )
  )
  WITH CHECK (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
    OR (
      professor_id = auth.uid()
      AND public.has_role('professor'::public.app_role, auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.matriculas AS m
        JOIN public.professor_disciplinas AS pd ON pd.turma_id = m.turma_id
        JOIN public.disciplinas AS d ON d.id = pd.disciplina_id
        WHERE m.id = mini_pautas.aluno_id
          AND pd.professor_id = auth.uid()
          AND d.nome = mini_pautas.disciplina
      )
    )
  );

CREATE TABLE IF NOT EXISTS public.uniformes_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  processo text NOT NULL,
  tamanho integer NOT NULL CHECK (tamanho > 0),
  tipo text NOT NULL DEFAULT 'escolar'
    CHECK (tipo IN ('escolar', 'educacao_fisica')),
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor numeric(12, 2) NOT NULL DEFAULT 0 CHECK (valor >= 0),
  estado text NOT NULL DEFAULT 'Pendente'
    CHECK (estado IN ('Pendente', 'Entregue')),
  data date NOT NULL DEFAULT CURRENT_DATE,
  origem_local_id text,
  criado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniformes_entregas_origem_local_uidx
  ON public.uniformes_entregas (origem_local_id)
  WHERE origem_local_id IS NOT NULL;

ALTER TABLE public.uniformes_entregas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS uniformes_entregas_staff_select ON public.uniformes_entregas;
CREATE POLICY uniformes_entregas_staff_select
  ON public.uniformes_entregas
  FOR SELECT TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

DROP POLICY IF EXISTS uniformes_entregas_staff_insert ON public.uniformes_entregas;
CREATE POLICY uniformes_entregas_staff_insert
  ON public.uniformes_entregas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

DROP POLICY IF EXISTS uniformes_entregas_staff_update ON public.uniformes_entregas;
CREATE POLICY uniformes_entregas_staff_update
  ON public.uniformes_entregas
  FOR UPDATE TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  )
  WITH CHECK (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

DROP POLICY IF EXISTS uniformes_entregas_staff_delete ON public.uniformes_entregas;
CREATE POLICY uniformes_entregas_staff_delete
  ON public.uniformes_entregas
  FOR DELETE TO authenticated
  USING (
    public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

CREATE INDEX IF NOT EXISTS uniformes_entregas_data_nome_idx
  ON public.uniformes_entregas (data DESC, nome);

CREATE TABLE IF NOT EXISTS public.notas_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota_id text,
  aluno_id integer NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
  aluno_nome text NOT NULL,
  professor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disciplina text NOT NULL,
  trimestre integer NOT NULL,
  ano_letivo integer NOT NULL,
  acao text NOT NULL,
  valores_anteriores jsonb,
  valores_novos jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notas_historico ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notas_historico_staff_read ON public.notas_historico;
CREATE POLICY notas_historico_staff_read
  ON public.notas_historico
  FOR SELECT TO authenticated
  USING (
    professor_id = auth.uid()
    OR public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

DROP POLICY IF EXISTS notas_historico_staff_insert ON public.notas_historico;
CREATE POLICY notas_historico_staff_insert
  ON public.notas_historico
  FOR INSERT TO authenticated
  WITH CHECK (
    professor_id = auth.uid()
    OR public.has_role('admin'::public.app_role, auth.uid())
    OR public.has_role('secretario'::public.app_role, auth.uid())
  );

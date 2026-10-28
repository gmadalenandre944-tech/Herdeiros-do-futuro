-- Adds an atomic, name-and-class-only student registration flow for payments.
-- Existing rows are not assigned an academic year; the function tags only new
-- quick registrations with the active 2026/2027 year.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS ano_lectivo text;

ALTER TABLE public.students
  ALTER COLUMN birth_date DROP NOT NULL,
  ALTER COLUMN gender DROP NOT NULL;

ALTER TABLE public.alunos
  ALTER COLUMN numero_processo DROP NOT NULL,
  ALTER COLUMN data_nascimento DROP NOT NULL,
  ALTER COLUMN sexo DROP NOT NULL;

COMMENT ON COLUMN public.students.ano_lectivo IS
  'Academic year for quick registrations; existing rows remain NULL unless explicitly reconciled.';

CREATE OR REPLACE FUNCTION public.registar_aluno_pagamento_rapido(
  p_id uuid,
  p_nome text,
  p_classe text,
  p_ano_lectivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_student public.students%ROWTYPE;
  v_aluno public.alunos%ROWTYPE;
  v_norm_name text;
  v_norm_class text;
  v_norm_turma text;
  v_turma text;
  v_id uuid;
  v_created_student boolean := false;
  v_created_aluno boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A sessão expirou. Entre novamente para continuar.'
      USING ERRCODE = '42501';
  END IF;

  IF p_nome IS NULL OR btrim(p_nome) = '' OR length(btrim(p_nome)) > 160 THEN
    RAISE EXCEPTION 'Indique um nome completo válido (até 160 caracteres).'
      USING ERRCODE = '22023';
  END IF;

  IF p_ano_lectivo IS DISTINCT FROM '2026/2027' THEN
    RAISE EXCEPTION 'O ano lectivo desta operação deve ser 2026/2027.'
      USING ERRCODE = '22023';
  END IF;

  IF p_classe NOT IN (
    'Iniciação', '1ª Classe', '2ª Classe', '3ª Classe', '4ª Classe',
    '5ª Classe', '6ª Classe', '7ª Classe', '8ª Classe', '9ª Classe'
  ) THEN
    RAISE EXCEPTION 'Seleccione uma classe válida.'
      USING ERRCODE = '22023';
  END IF;

  v_norm_name := translate(lower(btrim(p_nome)),
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
  v_norm_class := translate(lower(btrim(p_classe)),
    'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc');
  v_turma := 'Turma Única — ' || p_classe;

  -- Serialize equal name/class/year requests to avoid concurrent duplicates.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_norm_name || '|' || v_norm_class || '|' || p_ano_lectivo, 0)
  );

  SELECT *
    INTO v_student
    FROM public.students
   WHERE ano_lectivo = p_ano_lectivo
     AND translate(lower(btrim(full_name)),
       'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc') = v_norm_name
     AND position(v_norm_class IN translate(lower(coalesce(turma, '')),
       'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc')) > 0
   ORDER BY created_at DESC NULLS LAST
   LIMIT 1
   FOR UPDATE;

  IF v_student.id IS NULL THEN
    v_id := p_id;
    INSERT INTO public.students (id, full_name, birth_date, gender, turma, created_at, ano_lectivo)
    VALUES (v_id, btrim(p_nome), NULL, NULL, v_turma, now(), p_ano_lectivo)
    RETURNING * INTO v_student;
    v_created_student := true;
  ELSE
    v_id := v_student.id;
  END IF;

  SELECT *
    INTO v_aluno
    FROM public.alunos
   WHERE id = v_id
   LIMIT 1
   FOR UPDATE;

  IF v_aluno.id IS NULL THEN
    INSERT INTO public.alunos (id, nome_completo, numero_processo, data_nascimento, sexo)
    VALUES (v_id, btrim(p_nome), NULL, NULL, NULL)
    RETURNING * INTO v_aluno;
    v_created_aluno := true;
  END IF;

  RETURN jsonb_build_object(
    'student', to_jsonb(v_student),
    'aluno', to_jsonb(v_aluno),
    'created_student', v_created_student,
    'created_aluno', v_created_aluno
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.registar_aluno_pagamento_rapido(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registar_aluno_pagamento_rapido(uuid, text, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

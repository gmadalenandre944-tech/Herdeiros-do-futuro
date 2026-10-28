import { db } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";

export type StudentInsertInput = {
  fullName: string;
  idade?: number | null;
  birthDate?: string;
  gender?: string | null;
  turma?: string | null;
  classe?: string | null;
};

export const normalizeStudentRow = (row: any) => {
  const turma = String(row?.turma ?? "").trim();
  const classe = String(row?.classe ?? "").trim();
  return {
    ...row,
    id: String(row?.id ?? ""),
    nome_completo: String(row?.nome_completo ?? row?.full_name ?? row?.nome ?? ""),
    data_nascimento: String(row?.data_nascimento ?? row?.birth_date ?? ""),
    classe: classe || "Turma Única",
    turma: turma || "Turma Única",
    status: String(row?.status ?? row?.estado ?? ""),
  };
};

const anoLectivoAtual = (ano?: number) => {
  const y = ano ?? new Date().getFullYear();
  return `${y}/${y + 1}`;
};

const clean = (v?: string | null) => {
  const s = String(v ?? "").trim();
  return s ? s : null;
};

// Sessão local: não faz uma viagem extra à base de dados em cada gravação.
const currentUserId = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
};

const explain = (error: any, acao: string) => {
  const msg = String(error?.message ?? "");
  if (error?.code === "42501" || /row-level security/i.test(msg)) {
    return new Error(`${acao}: a sua conta não tem permissão para gravar. Inicie sessão como secretaria.`);
  }
  return new Error(`${acao}: ${msg || "falha na ligação à base de dados."}`);
};

const NOVAS_COLUNAS = ["numero_processo", "idade", "genero"];
const isMissingColumn = (error: any) =>
  error && (error.code === "42703" || error.code === "PGRST204") &&
  NOVAS_COLUNAS.some((c) => String(error.message ?? "").includes(c));

/** Insere; se a base ainda não tiver as colunas novas, grava sem elas e avisa. */
async function insertComColunasNovas(table: string, payload: Record<string, unknown>) {
  let res = await db(table).insert([payload]).select().single();
  if (isMissingColumn(res.error)) {
    const semNovas = { ...payload };
    NOVAS_COLUNAS.forEach((c) => delete semNovas[c]);
    res = await db(table).insert([semNovas]).select().single();
    if (!res.error) {
      console.warn(`[${table}] colunas numero_processo/idade/genero em falta — execute a migração 20261009.`);
    }
  }
  return res;
}

/** Grava a matrícula na tabela `matriculas`. */
export async function registarAlunoCompleto(
  input: StudentInsertInput & { numeroProcesso?: string; anoLetivo?: number; propina?: number; requisitos?: string },
): Promise<{ student: any; aluno: any; createdStudent: boolean; createdAluno: boolean }> {
  const nome = clean(input.fullName);
  if (!nome) throw new Error("Indique o nome completo do aluno.");
  const uid = await currentUserId();
  const payload: Record<string, unknown> = {
    nome_completo: nome,
    data_nascimento: clean(input.birthDate),
    sexo: clean(input.gender),
    genero: clean(input.gender),
    numero_processo: clean(input.numeroProcesso),
    idade: input.idade ?? null,
    classe: clean(input.classe),
    turma: clean(input.turma),
    ano_lectivo: anoLectivoAtual(input.anoLetivo),
    data_matricula: new Date().toISOString(),
  };
  if (input.propina != null) payload.propina = input.propina;
  if (input.requisitos) payload.requisitos = input.requisitos;
  if (uid) payload.registrado_por = uid;

  let { data, error } = await insertComColunasNovas("matriculas", payload);
  // registrado_por pode ter outro tipo — tenta sem ele
  if (error && uid && /registrado_por|uuid|integer/i.test(String(error.message))) {
    delete payload.registrado_por;
    ({ data, error } = await insertComColunasNovas("matriculas", payload));
  }
  if (error) throw explain(error, "Matrícula não gravada");
  return { student: data, aluno: data, createdStudent: true, createdAluno: true };
}

export async function registarAlunoRapido(input: { fullName: string; classe: string }) {
  return registarAlunoCompleto({ fullName: input.fullName, classe: input.classe });
}

/** Grava a confirmação na tabela `confirmacoes`. */
export async function registarConfirmacao(
  input: StudentInsertInput & { numeroProcesso?: string; recibo?: string; sala?: string; anoLetivo?: number },
): Promise<any> {
  const nome = clean(input.fullName);
  if (!nome) throw new Error("Indique o nome completo do aluno.");
  const uid = await currentUserId();
  const notas = [
    input.numeroProcesso ? `Processo: ${input.numeroProcesso}` : "",
    input.recibo ? `Recibo: ${input.recibo}` : "",
    input.sala ? `Sala: ${input.sala}` : "",
  ].filter(Boolean).join(" · ");
  const payload: Record<string, unknown> = {
    nome_completo: nome,
    data_nascimento: clean(input.birthDate),
    sexo: clean(input.gender),
    genero: clean(input.gender),
    numero_processo: clean(input.numeroProcesso),
    idade: input.idade ?? null,
    classe: clean(input.classe),
    turma: clean(input.turma),
    ano_lectivo: anoLectivoAtual(input.anoLetivo),
    data_confirmacao: new Date().toISOString(),
    requisitos: notas || null,
  };
  if (uid) payload.confirmado_por = uid;

  let { data, error } = await insertComColunasNovas("confirmacoes", payload);
  if (error && uid && /confirmado_por|uuid|integer/i.test(String(error.message))) {
    delete payload.confirmado_por;
    ({ data, error } = await insertComColunasNovas("confirmacoes", payload));
  }
  if (error) throw explain(error, "Confirmação não gravada");
  return data;
}

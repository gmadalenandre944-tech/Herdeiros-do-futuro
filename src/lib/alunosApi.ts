import { db as dbFrom } from "@/lib/db";
import { requireUuid } from "@/lib/uuid";
import { compararPorClasse } from "@/lib/schoolData";

export interface AlunoRow {
  id: string;
  nome: string;
  classe: string | null;
  turma_id: string | null;
  numero_processo: string | null;
  data_nascimento: string | null;
  contacto: string | null;
  encarregado: string | null;
  [k: string]: any;
}

export interface AlunosError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export interface AlunosResult {
  data: AlunoRow[];
  error: AlunosError | null;
}

export interface AlunosFiltro {
  turma_id?: string;
  classe?: string;
  search?: string;
  limit?: number;
}

export const normalizeAluno = (a: any): AlunoRow => ({
  ...a,
  id: requireUuid(a?.id),
  nome: a?.nome_completo ?? a?.nome ?? "",
  numero_processo: a?.numero_processo ?? null,
  data_nascimento: a?.data_nascimento ?? null,
  contacto: a?.contacto ?? a?.telefone ?? null,
  encarregado: a?.encarregado ?? a?.nome_encarregado ?? null,
  classe: a?.classe ?? null,
  turma_id: a?.turma_id ?? null,
});

/**
 * Consulta os alunos reais no Supabase.
 * Devolve SEMPRE { data, error } — um erro nunca é convertido silenciosamente
 * numa lista vazia, para a UI poder distinguir "sem alunos" de "falha ao ler".
 */
export async function fetchAlunosResult(filtro?: AlunosFiltro): Promise<AlunosResult> {
  // Lê TODOS os alunos em páginas de 1000 (o servidor limita cada pedido a 1000).
  const data: any[] = [];
  let error: any = null;
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const res = await dbFrom("vw_alunos_ordenados").select("*").range(from, from + pageSize - 1);
    if (res.error) { error = res.error; break; }
    const page = (res.data ?? []) as any[];
    data.push(...page);
    if (page.length < pageSize || (filtro?.limit && data.length >= filtro.limit)) break;
  }
  if (filtro?.limit) data.splice(filtro.limit);
  if (error) {
    console.error("[alunosApi] falha ao ler a tabela `vw_alunos_ordenados`:", error);
    return { data: [], error: error as AlunosError };
  }

  let list: AlunoRow[];
  try {
    list = ((data ?? []) as any[]).map(normalizeAluno);
  } catch (idError: any) {
    return {
      data: [],
      error: { message: idError?.message ?? "A vista devolveu um ID de aluno inválido." },
    };
  }

  if (filtro?.turma_id) list = list.filter((a) => a.turma_id === filtro.turma_id);
  if (filtro?.classe) list = list.filter((a) => (a.classe ?? "") === filtro.classe);

  if (filtro?.search) {
    const s = filtro.search.toLowerCase();
    list = list.filter((a) => a.nome.toLowerCase().includes(s));
  }

  return { data: list.sort(compararPorClasse), error: null };
}

/** Versão que lança em caso de erro (para quem prefere try/catch). */
export async function fetchAlunosOrdenados(filtro?: AlunosFiltro): Promise<AlunoRow[]> {
  const { data, error } = await fetchAlunosResult(filtro);
  if (error) throw new Error(error.message ?? "Erro ao carregar alunos");
  return data;
}

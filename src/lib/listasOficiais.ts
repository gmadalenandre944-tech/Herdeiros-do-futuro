import { db } from "@/lib/db";
import { ANO_LETIVO_ATUAL, CLASSES_OFICIAIS, normalizeClasseOficial } from "@/lib/schoolData";
import { sortStudents, comparePortuguese } from "@/lib/studentOrder";

export type TipoMovimento = "Matrícula" | "Confirmação";

export interface LinhaListaOficial {
  key: string;
  id: number | string;
  tabela: "matriculas" | "confirmacoes";
  numero_processo: string;
  nome_completo: string;
  idade: number | null;
  data_nascimento: string;
  genero: string;
  classe: string;
  turma: string;
  tipo: TipoMovimento;
}

const txt = (v: unknown) => String(v ?? "").trim();

const extrairProcesso = (row: any) => {
  const direto = txt(row?.numero_processo);
  if (direto) return direto;
  const m = txt(row?.requisitos).match(/Processo:\s*([^·]+)/i);
  return m ? m[1].trim() : "";
};

const calcIdade = (nasc: unknown): number | null => {
  const d = new Date(txt(nasc));
  if (isNaN(d.getTime())) return null;
  const hoje = new Date();
  let a = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) a--;
  return a >= 0 && a < 100 ? a : null;
};

async function lerTodas(table: string) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db(table).select("*").order("classe").order("nome_completo").order("id").range(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const mapRow = (row: any, tabela: LinhaListaOficial["tabela"]): LinhaListaOficial => ({
  key: `${tabela}-${row.id}`,
  id: row.id,
  tabela,
  numero_processo: extrairProcesso(row),
  nome_completo: txt(row?.nome_completo) || "Aluno sem nome",
  idade: row?.idade != null && row.idade !== "" ? Number(row.idade) : calcIdade(row?.data_nascimento),
  data_nascimento: txt(row?.data_nascimento ?? row?.birth_date).slice(0, 10),
  genero: txt(row?.genero ?? row?.sexo),
  classe: normalizeClasseOficial(row?.classe),
  turma: txt(row?.turma) || "Turma Única",
  tipo: tabela === "matriculas" ? "Matrícula" : "Confirmação",
});

/** Lê os alunos da vista `vw_alunos_ordenados` (já ordenada por classe). */
export async function fetchListaOficial(anoLectivo = ANO_LETIVO_ATUAL): Promise<LinhaListaOficial[]> {
  const rows = await lerTodas("vw_alunos_ordenados");
  // Mostra todos os alunos da vista, de qualquer ano lectivo.
  void anoLectivo;
  return sortStudents(rows.map((r) => mapRow(r, "matriculas")));
}

export async function guardarIdade(linha: LinhaListaOficial, idade: number | null) {
  const { error } = await db(linha.tabela).update({ idade }).eq("id", linha.id);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      throw new Error("A coluna 'idade' ainda não existe na base de dados. Execute o ficheiro de migração 20261009 no Supabase.");
    }
    throw new Error(error.message);
  }
}

export function agruparPorClasse(linhas: LinhaListaOficial[]) {
  const ordem = [...CLASSES_OFICIAIS] as string[];
  const extras = [...new Set(linhas.map((l) => l.classe))].filter((c) => !ordem.includes(c));
  return [...ordem, ...extras].map((classe) => {
    const daClasse = linhas.filter((l) => l.classe === classe);
    const turmas = [...new Set(daClasse.map((l) => l.turma))]
      .sort(comparePortuguese)
      .map((turma) => ({ turma, alunos: sortStudents(daClasse.filter((l) => l.turma === turma)) }));
    return { classe, total: daClasse.length, turmas };
  });
}

export interface EdicaoLinha {
  numero_processo: string;
  nome_completo: string;
  idade: number | null;
  data_nascimento: string;
  genero: string;
}

const erroColuna = (error: any) =>
  error.code === "42703" || error.code === "PGRST204"
    ? new Error("Uma das colunas (nº de processo, idade, data de nascimento ou género) não existe na base de dados. Execute o ficheiro de instruções no Supabase.")
    : new Error(error.message);

/** Guarda nº de processo, nome, idade e género de uma linha. */
export async function guardarLinha(linha: LinhaListaOficial, dados: EdicaoLinha) {
  const { error, data } = await db(linha.tabela)
    .update({
      numero_processo: dados.numero_processo.trim() || null,
      nome_completo: dados.nome_completo.trim(),
      idade: dados.idade,
      data_nascimento: dados.data_nascimento || null,
      genero: dados.genero.trim() || null,
    })
    .eq("id", linha.id).select("id");
  if (error) throw erroColuna(error);
  if (!data?.length) throw new Error("Sem permissão para alterar este registo.");
}

/** Elimina a matrícula ou confirmação. */
export async function eliminarLinha(linha: LinhaListaOficial) {
  const { error, count } = await db(linha.tabela).delete({ count: "exact" }).eq("id", linha.id);
  if (error) throw new Error(error.message);
  if (count === 0) throw new Error("Sem permissão para eliminar este registo.");
}

const chaveAluno = (l: LinhaListaOficial) =>
  `${l.nome_completo.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ")}|${l.classe}`;

/**
 * Todos os alunos matriculados E confirmados (vista + tabela `confirmacoes`),
 * sem duplicados, ordenados por classe/turma/nome — base das listas de presença.
 */
export async function fetchAlunosPresenca(): Promise<LinhaListaOficial[]> {
  const [matriculas, confirmacoes] = await Promise.all([
    fetchListaOficial(),
    lerTodas("confirmacoes").catch((e) => { console.warn("[presenças] confirmacoes indisponível:", e); return [] as any[]; }),
  ]);
  const vistos = new Map<string, LinhaListaOficial>();
  for (const l of matriculas) vistos.set(chaveAluno(l), l);
  for (const row of confirmacoes) {
    const l = mapRow(row, "confirmacoes");
    if (!vistos.has(chaveAluno(l))) vistos.set(chaveAluno(l), l);
  }
  const ordem = [...CLASSES_OFICIAIS] as string[];
  const rank = (c: string) => (ordem.indexOf(c) < 0 ? 99 : ordem.indexOf(c));
  return [...vistos.values()].sort((a, b) =>
    rank(a.classe) - rank(b.classe) ||
    a.turma.localeCompare(b.turma, undefined, { numeric: true }) ||
    comparePortuguese(a.nome_completo, b.nome_completo));
}

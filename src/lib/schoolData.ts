import { supabase } from "@/integrations/supabase/client";
import { comparePortuguese, compareStudents } from "@/lib/studentOrder";

/**
 * Camada de acesso à base de dados adaptada unicamente às tabelas reais e atuais:
 * `matriculas`, `confirmacoes`, `vw_alunos_ordenados` e tabelas próprias
 * dos restantes módulos académicos.
 */

const db = (t: string): any => (supabase as any).from(t);

export const ANO_LETIVO_ATUAL = "2026/2027";
export const ANO_LETIVO_ANTERIOR = "2025/2026";

export const CLASSES_OFICIAIS = [
  "Iniciação",
  "1ª Classe",
  "2ª Classe",
  "3ª Classe",
  "4ª Classe",
  "5ª Classe",
  "6ª Classe",
  "7ª Classe",
  "8ª Classe",
  "9ª Classe",
] as const;

/** Ordena por classe (Iniciação → 9ª), depois turma e nome. */
export const ordemClasse = (classe: unknown) => {
  const c = String(classe ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (c.includes("inic")) return 0;
  const m = c.match(/(\d+)/);
  return m ? Number(m[1]) : 99;
};
export const compararPorClasse = (a: any, b: any) =>
  ordemClasse(a?.classe) - ordemClasse(b?.classe) ||
  String(a?.classe ?? "").localeCompare(String(b?.classe ?? "")) ||
  String(a?.turma ?? "").localeCompare(String(b?.turma ?? ""), "pt", { numeric: true }) ||
  comparePortuguese(a?.nome ?? a?.nome_completo, b?.nome ?? b?.nome_completo);

export type TipoMovimentoAcademico = "Matrícula" | "Confirmação";

export type AcademicRosterRecord = {
  id: string;
  alunoId: string | null;
  nome: string;
  processo: string;
  classe: string;
  turma: string;
  estado: string;
  tipoMovimento: TipoMovimentoAcademico;
  origem: TipoMovimentoAcademico;
  anoLectivo: string;
  raw: any;
};

export interface Aluno {
  id: string;
  nome: string;
  numero_processo: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  classe: string | null;
  turma_id: string | null;
  raw: any;
}

export interface Matricula {
  id: string;
  nome: string;
  numero_processo: string | null;
  data_nascimento: string | null;
  sexo: string | null;
  classe: string | null;
  turma: string | null;
  turma_id: string | null;
  ano_lectivo: string | null;
  propina: number | null;
  raw: any;
}

export interface Turma {
  id: string;
  nome: string;
  classe: string | null;
  classe_id: string | null;
  turno: string | null;
  sala: string | null;
  ano_lectivo: number | null;
  raw: any;
}

export interface Disciplina {
  id: string;
  nome: string;
  classe: string | null;
  raw: any;
}

export interface Classe {
  id: string;
  nome: string;
}

const text = (value: unknown, fallback = "") => {
  const result = String(value ?? "").trim();
  return result || fallback;
};

const databaseId = (value: unknown) => {
  const id = text(value);
  if (!id) throw new Error("A base de dados devolveu um ID vazio.");
  return id;
};

const normalizedLabel = (value: unknown) =>
  text(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

export const normalizeClasseOficial = (value: unknown) => {
  const label = text(value);
  const normalized = normalizedLabel(label);
  if (!normalized) return "Sem classe";
  if (normalized.includes("iniciac")) return "Iniciação";

  // "5ª Classe Turma A", "5ª Classe B", "6a classe - A" → classe sem a turma.
  const comTurma = normalized.match(/^([1-9])\s*[aªºo]?\s*classe\b/);
  if (comTurma?.[1]) return `${comTurma[1]}ª Classe`;

  const ordinal = normalized.match(
    /(?:^|\s)([1-9])(?:\s*[aªºo]?|\s+classe)?(?:\s+classe)?$/,
  );
  if (ordinal?.[1]) return `${ordinal[1]}ª Classe`;

  const writtenOrdinals: Record<string, string> = {
    primeira: "1ª Classe",
    segunda: "2ª Classe",
    terceira: "3ª Classe",
    quarta: "4ª Classe",
    quinta: "5ª Classe",
    sexta: "6ª Classe",
    setima: "7ª Classe",
    sétima: "7ª Classe",
    oitava: "8ª Classe",
    nona: "9ª Classe",
  };
  const written = Object.entries(writtenOrdinals).find(([word]) =>
    normalized.includes(word),
  );
  return written?.[1] ?? label;
};

export const classeFromTurma = (value: unknown) => {
  const raw = text(value);
  if (!raw) return "Sem classe";

  const candidates = [...raw.split(/\s+[—–-]\s+/).reverse(), raw];
  for (const candidate of candidates) {
    const normalized = normalizeClasseOficial(candidate);
    const official = CLASSES_OFICIAIS.find(
      (classe) => normalizedLabel(classe) === normalizedLabel(normalized),
    );
    if (official) return official;
  }
  return "Sem classe";
};

export const turmaNomeFromTurma = (value: unknown) => {
  const raw = text(value);
  if (!raw) return "";
  const parts = raw
    .split(/\s+[—–-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (
    parts.length > 1 &&
    classeFromTurma(parts[parts.length - 1]) !== "Sem classe"
  ) {
    return parts.slice(0, -1).join(" — ");
  }
  return classeFromTurma(raw) !== "Sem classe" ? "" : raw;
};

export const TODAS_TURMAS = "Todas";

/** Letra da turma do aluno (ex: "A" para 5A), a partir do campo turma ou do texto da classe. */
export const turmaLetra = (aluno: { classe?: unknown; turma?: unknown }) => {
  const fromText = (v: unknown) => {
    const n = normalizedLabel(v);
    if (!n) return "";
    const m =
      n.match(/classe\s*(?:[—–-]\s*)?(?:turma\s+)?([a-z])$/) ??
      n.match(/^(?:turma\s+)?([a-z])$/) ??
      n.match(/^[1-9]\s*[aªº]?\s*([a-z])$/) ??
      n.match(/turma\s+([a-z])\b/);
    return m?.[1] ? m[1].toUpperCase() : "";
  };
  return fromText(aluno.turma) || fromText(aluno.classe);
};

/** Código curto da turma: "5A", "6B"; sem letra devolve só o número. */
export const codigoTurma = (aluno: { classe?: unknown; turma?: unknown }) => {
  const c = normalizeClasseOficial(aluno.classe);
  const n = c.match(/^(\d)/)?.[1] ?? (c === "Iniciação" ? "Inic." : c);
  return `${n}${turmaLetra(aluno)}`;
};

/** Letras de turma existentes numa classe, ordenadas. */
/** Turmas que existem sempre na escola, mesmo antes de os alunos carregarem. */
export const TURMAS_FIXAS: Record<string, string[]> = {
  "5ª Classe": ["A", "B"],
  "6ª Classe": ["A", "B"],
};

/** Classes que realmente existem nos alunos lidos de `alunos_ordenados` (vista vw_alunos_ordenados),
 *  na ordem oficial (Iniciação → 9ª); classes fora da lista oficial vão para o fim. */
export const classesDaVista = (alunos: { classe?: unknown }[]) => {
  const ordem = CLASSES_OFICIAIS as readonly string[];
  const presentes = [...new Set(alunos.map((a) => normalizeClasseOficial(a.classe)).filter(Boolean))];
  return presentes.sort((a, b) => {
    const ia = ordem.indexOf(a), ib = ordem.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b, "pt");
  });
};


export const turmasDaClasse = (alunos: { classe?: unknown; turma?: unknown }[], classe: string) =>
  [...new Set([
    ...(TURMAS_FIXAS[classe] ?? []),
    ...alunos.filter((a) => normalizeClasseOficial(a.classe) === classe).map(turmaLetra).filter(Boolean),
  ])].sort();

export const filtrarPorClasseTurma = <T extends { classe?: unknown; turma?: unknown }>(alunos: T[], classe: string, letra: string) =>
  alunos.filter((a) => normalizeClasseOficial(a.classe) === classe && (!letra || letra === TODAS_TURMAS || turmaLetra(a) === letra));

const normalizeTipoMovimento = (row: any): TipoMovimentoAcademico => {
  if (row?.confirmacao_id || row?.confirmacaoId) return "Confirmação";
  return "Matrícula";
};

const normalizeAnoLectivo = (value: unknown) => {
  const raw = text(value).replace(/[–—-]/g, "/").replace(/\s+/g, "");
  if (/^\d{4}$/.test(raw)) return `${raw}/${Number(raw) + 1}`;
  return raw;
};

export const normalizeAluno = (a: any): Aluno => ({
  id: databaseId(a?.aluno_id ?? a?.id),
  nome: String(a?.nome_completo ?? a?.nome ?? a?.full_name ?? ""),
  numero_processo: a?.numero_processo ?? a?.processo ?? null,
  data_nascimento: a?.data_nascimento ?? a?.birth_date ?? null,
  sexo: a?.sexo ?? a?.gender ?? null,
  classe: a?.classe ?? null,
  turma_id: a?.turma_id ?? null,
  raw: a,
});

export const normalizeTurma = (t: any): Turma => ({
  id: databaseId(t?.id),
  nome: String(t?.turma ?? t?.nome ?? t?.designacao ?? "Turma"),
  classe: t?.classe ?? null,
  classe_id: t?.classe_id ?? null,
  turno: t?.turno ?? null,
  sala: t?.sala ?? null,
  ano_lectivo: t?.ano_lectivo ?? t?.ano_letivo ?? null,
  raw: t,
});

export const normalizeDisciplina = (d: any): Disciplina => ({
  id: databaseId(d?.id),
  nome: String(d?.nome ?? d?.designacao ?? ""),
  classe: d?.classe ?? null,
  raw: d,
});

type SelectResult = { rows: any[]; error: any };

// Leituras iguais feitas ao mesmo tempo (ou com poucos segundos de diferença,
// ex.: painel + cabeçalho + lista) partilham o mesmo pedido à base de dados.
const READ_TTL_MS = 15_000;
// Depois disso, e até STALE_MAX_MS, a página abre logo com os dados já lidos
// e a base de dados é consultada em segundo plano para a próxima visita.
const STALE_MAX_MS = 5 * 60_000;
type CacheEntry = { at: number; promise: Promise<SelectResult>; refreshing?: boolean };
const readCache = new Map<string, CacheEntry>();

// Cópia guardada no próprio computador (por conta), para abrir logo e para
// continuar a funcionar quando a internet falha por instantes.
const SAVED_PREFIX = "hf-dados|";
const SAVED_MAX_AGE_MS = 24 * 60 * 60_000;
let currentUserId: string | null = null;
const savedKey = (key: string) => (currentUserId ? `${SAVED_PREFIX}${currentUserId}|${key}` : null);
function readSaved(key: string): any[] | null {
  try {
    const k = savedKey(key);
    if (!k || typeof localStorage === "undefined") return null;
    const v = JSON.parse(localStorage.getItem(k) ?? "null");
    return v && Date.now() - v.at < SAVED_MAX_AGE_MS && Array.isArray(v.rows) ? v.rows : null;
  } catch { return null; }
}
function writeSaved(key: string, rows: any[]) {
  try {
    const k = savedKey(key);
    if (k && typeof localStorage !== "undefined") localStorage.setItem(k, JSON.stringify({ at: Date.now(), rows }));
  } catch { /* espaço cheio: ignora */ }
}
function clearSaved(table?: string) {
  try {
    if (typeof localStorage === "undefined") return;
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(SAVED_PREFIX)) continue;
      if (!table || k.includes(`|${table}|`)) localStorage.removeItem(k);
    }
  } catch { /* ignora */ }
}

const isNetworkError = (e: any) => /failed to fetch|network|load failed|fetch failed|timeout/i.test(String(e?.message ?? e ?? ""));

/** Esquece leituras recentes (após gravar, ou ao sair da conta). */
export function invalidateSchoolData(table?: string) {
  clearSaved(table);
  if (!table) return readCache.clear();
  for (const key of readCache.keys()) if (key.startsWith(`${table}|`)) readCache.delete(key);
}

if (typeof window !== "undefined") {
  supabase.auth?.onAuthStateChange?.((event, session) => {
    const id = session?.user?.id ?? null;
    if (event === "SIGNED_OUT") { clearSaved(); readCache.clear(); currentUserId = null; return; }
    if (event === "SIGNED_IN" && id !== currentUserId) readCache.clear();
    currentUserId = id;
  });
}

function selectAll(table: string, pageSize = 1000, orderBy = "id"): Promise<SelectResult> {
  const key = `${table}|${pageSize}|${orderBy}`;
  const hit = readCache.get(key);
  const age = hit ? Date.now() - hit.at : Infinity;
  if (hit && age < READ_TTL_MS) return hit.promise;

  const fetchFresh = async (): Promise<SelectResult> => {
    let result = await selectAllUncached(table, pageSize, orderBy).catch((error) => ({ rows: [], error }));
    // Falha de internet momentânea: tenta mais duas vezes antes de desistir.
    for (let i = 0; result.error && isNetworkError(result.error) && i < 2; i++) {
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
      result = await selectAllUncached(table, pageSize, orderBy).catch((error) => ({ rows: [], error }));
    }
    if (!result.error) { writeSaved(key, result.rows); return result; }
    readCache.delete(key);
    const saved = isNetworkError(result.error) ? readSaved(key) : null;
    if (saved) {
      console.warn(`[schoolData] sem ligação; a mostrar a última cópia de \`${table}\`.`);
      return { rows: saved, error: null };
    }
    return result;
  };

  if (hit && age < STALE_MAX_MS) {
    if (!hit.refreshing) {
      hit.refreshing = true;
      fetchFresh().then((result) => {
        // Só substitui se ninguém limpou a cache entretanto (gravação/saída).
        if (!result.error && readCache.get(key) === hit) {
          readCache.set(key, { at: Date.now(), promise: Promise.resolve(result) });
        }
      });
    }
    return hit.promise;
  }

  // Primeira visita nesta sessão: abre logo com a cópia guardada e actualiza por trás.
  const saved = readSaved(key);
  if (saved) {
    const entry: CacheEntry = { at: Date.now() - READ_TTL_MS, promise: Promise.resolve({ rows: saved, error: null }), refreshing: true };
    readCache.set(key, entry);
    fetchFresh().then((result) => {
      if (!result.error && readCache.get(key) === entry) readCache.set(key, { at: Date.now(), promise: Promise.resolve(result) });
    });
    return entry.promise;
  }

  const promise = fetchFresh();
  readCache.set(key, { at: Date.now(), promise });
  return promise;
}

async function selectAllUncached(table: string, pageSize: number, orderBy: string): Promise<SelectResult> {
  let ordenar = true;
  const build = (withCount: boolean) => {
    // O total serve apenas para saber quantas páginas faltam; só na primeira.
    let q = withCount ? db(table).select("*", { count: "exact" }) : db(table).select("*");
    if (ordenar) q = ["matriculas", "confirmacoes", "vw_alunos_ordenados"].includes(table)
      ? q.order("classe").order("nome_completo").order("id")
      : q.order(orderBy, { ascending: true });
    return q;
  };

  let { data, error, count } = await build(true).range(0, pageSize - 1);
  // Se a vista não tiver a coluna de ordenação, lê sem ordenar em vez de falhar.
  if (error && (error.code === "42703" || /column/i.test(error.message ?? ""))) {
    ordenar = false;
    ({ data, error, count } = await build(true).range(0, pageSize - 1));
  }
  if (error) {
    console.error(`[schoolData] falha ao ler \`${table}\`:`, error.message);
    return { rows: [], error };
  }

  const first = (data ?? []) as any[];
  const total = typeof count === "number" ? count : first.length;
  // O servidor pode limitar o tamanho da página; usar o que realmente devolveu.
  const step = first.length;
  if (step === 0 || first.length >= total) return { rows: first, error: null };

  // Restantes páginas em paralelo, em vez de uma de cada vez.
  const offsets: number[] = [];
  for (let o = step; o < total; o += step) offsets.push(o);
  const pages = await Promise.all(offsets.map((o) => build(false).range(o, o + step - 1)));
  const rows = [...first];
  for (const page of pages) {
    if (page.error) {
      console.error(`[schoolData] falha ao ler \`${table}\`:`, page.error.message);
      return { rows: [], error: page.error };
    }
    rows.push(...((page.data ?? []) as any[]));
  }
  return { rows, error: null };
}

/** Lê os registos a partir da vista consolidada atual. */
export async function fetchAllStudentRecords() {
  const { rows, error } = await selectAll("vw_alunos_ordenados");
  if (error) {
    throw error;
  }
  return rows.map((row) => ({
    ...row,
    id: databaseId(row?.id),
  })).sort(compareStudents);
}

export async function fetchAlunos(): Promise<Aluno[]> {
  const { rows, error } = await selectAll("vw_alunos_ordenados");
  if (error) throw error;
  return rows.map(normalizeAluno).sort(compararPorClasse);
}

/** Lê as matrículas directamente; os IDs são inteiros usados por mini_pautas e pagamentos_propinas. */
export async function fetchMatriculas(): Promise<Matricula[]> {
  const { rows, error } = await selectAll("matriculas");
  if (error) throw error;
  return rows
    .map((row) => ({
      id: databaseId(row?.id),
      nome: text(row?.nome_completo ?? row?.nome, "Aluno sem nome"),
      numero_processo: row?.numero_processo ?? row?.processo ?? null,
      data_nascimento: row?.data_nascimento ?? null,
      sexo: row?.sexo ?? null,
      classe: text(row?.classe) || null,
      turma: text(row?.turma) || null,
      turma_id: row?.turma_id == null ? null : String(row.turma_id),
      ano_lectivo: row?.ano_lectivo == null ? null : String(row.ano_lectivo),
      propina: row?.propina == null ? null : Number(row.propina),
      raw: row,
    }))
    .sort(compareStudents);
}

/** Alunos da vista `vw_alunos_ordenados`, no formato de matrícula (IDs = matrículas). */
export async function fetchMatriculasDaVista(): Promise<Matricula[]> {
  const { rows, error } = await selectAll("vw_alunos_ordenados");
  if (error) throw error;
  return [...rows]
    .sort(
      (a, b) =>
        (Number(a?.ordem_classe) || 99) - (Number(b?.ordem_classe) || 99) ||
        comparePortuguese(a?.nome_completo, b?.nome_completo),
    )
    .map((row) => ({
      id: databaseId(row?.id),
      nome: text(row?.nome_completo ?? row?.nome, "Aluno sem nome"),
      numero_processo: row?.numero_processo ?? row?.processo ?? null,
      data_nascimento: row?.data_nascimento ?? null,
      sexo: row?.sexo ?? null,
      classe: text(row?.classe) || null,
      turma: text(row?.turma) || null,
      turma_id: row?.turma_id == null ? null : String(row.turma_id),
      ano_lectivo: row?.ano_lectivo == null ? null : String(row.ano_lectivo),
      propina: row?.propina == null ? null : Number(row.propina),
      raw: row,
    }));
}

export async function fetchTurmas(): Promise<Turma[]> {
  const { rows, error } = await selectAll("turmas");
  if (error) throw error;
  return rows.map(normalizeTurma).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function fetchDisciplinas(): Promise<Disciplina[]> {
  const { rows, error } = await selectAll("disciplinas");
  if (error) throw error;
  return rows
    .map(normalizeDisciplina)
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function fetchClasses(): Promise<Classe[]> {
  const { rows, error } = await selectAll("classes");
  if (error) throw error;
  return rows
    .map((c) => ({
      id: c.id,
      nome: String(c?.name ?? c?.nome ?? c?.designacao ?? ""),
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function fetchAlunoTurmaMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { rows, error } = await selectAll("matriculas");
  if (error) throw error;
  rows.forEach((row) => {
    if (row?.id != null && row?.turma_id != null) {
      map.set(String(row.id), String(row.turma_id));
    }
  });
  return map;
}

export async function fetchBaseEscolar() {
  const [alunos, turmas, disciplinas, classes] =
    await Promise.all([
      fetchAlunos(),
      fetchTurmas(),
      fetchDisciplinas(),
      fetchClasses(),
    ]);

  // A vista já contém a turma na maioria dos casos. Consultar matrículas
  // apenas quando é necessário recuperar uma ligação em falta.
  const matriculaMap = alunos.some((aluno) => aluno.turma_id == null)
    ? await fetchAlunoTurmaMap()
    : new Map<string, string>();

  const classeById = new Map(classes.map((c) => [c.id, c.nome]));
  const turmasResolved = turmas.map((t) => ({
    ...t,
    classe:
      t.classe ?? (t.classe_id ? (classeById.get(t.classe_id) ?? null) : null),
  }));
  const turmaById = new Map(turmasResolved.map((t) => [t.id, t]));

  const alunosResolved = alunos.map((a) => {
    const turmaId = a.turma_id ?? matriculaMap.get(a.id) ?? null;
    const turma = turmaId ? turmaById.get(turmaId) : undefined;
    return {
      ...a,
      turma_id: turmaId,
      turma_nome: turma?.nome ?? null,
      classe: a.classe ?? turma?.classe ?? null,
    };
  });

  return {
    alunos: alunosResolved,
    turmas: turmasResolved,
    disciplinas,
    classes,
  };
}

export type AlunoResolved = Awaited<
  ReturnType<typeof fetchBaseEscolar>
>["alunos"][number];

export const slugNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizeAcademicViewRow = (
  row: any,
  _index: number,
  anoLectivo: string,
): AcademicRosterRecord => {
  const id = databaseId(row?.aluno_id ?? row?.id);
  return {
    id,
    alunoId: id,
    nome: text(
      row?.nome_completo ?? row?.full_name ?? row?.nome,
      "Aluno sem nome",
    ),
    processo: text(row?.numero_processo ?? row?.processo, "—"),
    classe: text(row?.classe, "1ª Classe"),
    turma: text(row?.turma, "Turma Única"),
    estado: text(row?.status ?? row?.estado, "Confirmado"),
    tipoMovimento: normalizeTipoMovimento(row),
    origem: normalizeTipoMovimento(row),
    anoLectivo: text(row?.ano_lectivo, anoLectivo),
    raw: row,
  };
};

export async function fetchAcademicRoster(anoLectivo = ANO_LETIVO_ATUAL) {
  const rosters = await fetchAcademicRosters();
  return normalizeAnoLectivo(anoLectivo) ===
    normalizeAnoLectivo(ANO_LETIVO_ANTERIOR)
    ? rosters.anterior
    : rosters.atual;
}

const buildAcademicRoster = (
  rows: any[],
  anoLectivo: string,
  totalTurmas: number,
  errors: any[],
) => {
  const alunosAtuais = rows
    .map((row, index) => normalizeAcademicViewRow(row, index, anoLectivo))
    .sort(compararPorClasse);
  const porClasseMap = new Map<string, number>();
  alunosAtuais.forEach((row) =>
    porClasseMap.set(row.classe, (porClasseMap.get(row.classe) ?? 0) + 1),
  );

  return {
    anoLectivo,
    matriculas: [],
    confirmacoes: [],
    alunos: alunosAtuais,
    totalAlunos: alunosAtuais.length,
    totalTurmas,
    totalClasses: porClasseMap.size,
    porClasse: [...porClasseMap.entries()]
      .map(([classe, count]) => ({ classe, count }))
      .sort((a, b) => compararPorClasse(a, b)),
    errors,
  };
};

export async function fetchAcademicRosters() {
  const [viewResult, turmasResult] = await Promise.all([
    selectAll("vw_alunos_ordenados"),
    db("turmas").select("id", { count: "exact", head: true }),
  ]);

  const errors = [viewResult.error, turmasResult.error].filter(Boolean);
  const viewRows = viewResult.rows;
  const totalTurmas = Number(turmasResult.count ?? 0);

  const atual = buildAcademicRoster(
    viewRows,
    ANO_LETIVO_ATUAL,
    totalTurmas,
    errors,
  );
  const anterior = buildAcademicRoster(
    [],
    ANO_LETIVO_ANTERIOR,
    totalTurmas,
    errors,
  );

  return {
    atual,
    anterior,
    totalAlunos: atual.totalAlunos,
    totalAlunosAnterior: anterior.totalAlunos,
    totalAlunosGeral: atual.totalAlunos + anterior.totalAlunos,
  };
}

export async function resolveAlunoDoUtilizador(
  userId: string,
  _role?: string | null,
) {
  const { data: profile, error } = await db("profiles")
    .select("aluno_id, numero_processo, nome, data_nascimento")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;

  const [alunos, turmas] = await Promise.all([fetchAlunos(), fetchTurmas()]);
  const linkedId = profile?.aluno_id == null ? null : String(profile.aluno_id);
  let aluno = linkedId ? alunos.find((candidate) => candidate.id === linkedId) : undefined;

  const processo = text(profile?.numero_processo);
  if (!aluno && processo) {
    aluno = alunos.find((candidate) => text(candidate.numero_processo) === processo);
  }

  if (!aluno) {
    const nome = slugNome(text(profile?.nome));
    const nascimento = text(profile?.data_nascimento).slice(0, 10);
    const matches = nome && nascimento
      ? alunos.filter((candidate) =>
          slugNome(candidate.nome) === nome &&
          text(candidate.data_nascimento).slice(0, 10) === nascimento)
      : [];
    if (matches.length === 1) aluno = matches[0];
  }

  return { aluno: aluno ?? null, alunos, turmas };
}

export async function fetchMediasPorDisciplina(alunoId: string, ano = 2026) {
  const id = databaseId(alunoId);
  const { data, error } = await db("mini_pautas")
    .select("disciplina, media_final")
    .eq("aluno_id", id)
    .eq("ano_letivo", ano)
    .not("media_final", "is", null);
  if (error) throw error;

  const porDisciplina = new Map<string, { total: number; quantidade: number }>();
  for (const row of (data ?? []) as { disciplina?: unknown; media_final?: unknown }[]) {
    const disciplina = text(row.disciplina);
    const media = Number(row.media_final);
    if (!disciplina || row.media_final == null || !Number.isFinite(media)) continue;
    const atual = porDisciplina.get(disciplina) ?? { total: 0, quantidade: 0 };
    atual.total += media;
    atual.quantidade += 1;
    porDisciplina.set(disciplina, atual);
  }

  return [...porDisciplina.entries()]
    .map(([disciplina, notas]) => ({
      disciplina,
      media: notas.total / notas.quantidade,
    }))
    .sort((a, b) => b.media - a.media || a.disciplina.localeCompare(b.disciplina));
}

export async function fetchRankingTurma(
  alunosDaTurma: { id: string; nome: string }[],
  ano = 2026,
) {
  const alunosValidos = alunosDaTurma.filter((aluno) => Boolean(text(aluno.id)));
  if (alunosValidos.length === 0) return [];

  const nomesPorId = new Map(alunosValidos.map((aluno) => [aluno.id, aluno.nome]));
  const { data, error } = await db("mini_pautas")
    .select("aluno_id, media_final")
    .eq("ano_letivo", ano)
    .in("aluno_id", [...nomesPorId.keys()])
    .not("media_final", "is", null);
  if (error) throw error;

  const mediasPorAluno = new Map<string, { total: number; quantidade: number }>();
  for (const row of (data ?? []) as { aluno_id?: unknown; media_final?: unknown }[]) {
    const alunoId = text(row.aluno_id);
    const media = Number(row.media_final);
    if (!nomesPorId.has(alunoId) || row.media_final == null || !Number.isFinite(media)) continue;
    const atual = mediasPorAluno.get(alunoId) ?? { total: 0, quantidade: 0 };
    atual.total += media;
    atual.quantidade += 1;
    mediasPorAluno.set(alunoId, atual);
  }

  return [...mediasPorAluno.entries()]
    .map(([id, notas]) => ({
      id,
      nome: nomesPorId.get(id) ?? "",
      media: notas.total / notas.quantidade,
    }))
    .sort((a, b) => b.media - a.media || a.nome.localeCompare(b.nome));
}

type StudentLabel = { classe?: unknown; turma?: unknown; nome?: unknown; nome_completo?: unknown; key?: unknown; id?: unknown };
const label = (value: unknown) => String(value ?? "").trim();
export const comparePortuguese = (a: unknown, b: unknown) =>
  label(a).localeCompare(label(b), "pt", { sensitivity: "base", numeric: true });

export function compareStudents(a: StudentLabel, b: StudentLabel) {
  return comparePortuguese(a.classe, b.classe) ||
    comparePortuguese(a.turma, b.turma) ||
    comparePortuguese(a.nome_completo ?? a.nome, b.nome_completo ?? b.nome) ||
    comparePortuguese(a.key ?? a.id, b.key ?? b.id);
}

export const sortStudents = <T extends StudentLabel>(rows: readonly T[]): T[] => [...rows].sort(compareStudents);
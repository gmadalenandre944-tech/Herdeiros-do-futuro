import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db as dbFrom } from "@/lib/db";
import { sortStudents } from "@/lib/studentOrder";
import { invalidateSchoolData } from "@/lib/schoolData";

/** Cache partilhada da lista de matrículas (ordenada A-Z dentro de cada classe/turma). */
export const matriculasKey = ["matriculas", "lista"] as const;

type Row = { id: string; nome_completo: string; classe?: string; turma?: string; [k: string]: any };

export function useMatriculasQuery<T extends Row>(queryFn: () => Promise<T[]>) {
  return useQuery({
    queryKey: matriculasKey,
    queryFn: async () => sortStudents(await queryFn()),
    staleTime: 30_000,
    select: (rows) => sortStudents(rows as T[]),
  });
}

/** Mutações com actualização optimista: a lista reordena-se de imediato. */
export function useMatriculasMutations<T extends Row>() {
  const qc = useQueryClient();

  const optimistic = (apply: (rows: T[]) => T[]) => async () => {
    await qc.cancelQueries({ queryKey: matriculasKey });
    const previous = qc.getQueryData<T[]>(matriculasKey);
    qc.setQueryData<T[]>(matriculasKey, (rows) => sortStudents(apply(rows ?? [])));
    return { previous };
  };
  const rollback = (msg: string) => (err: any, _v: unknown, ctx?: { previous?: T[] }) => {
    if (ctx?.previous) qc.setQueryData(matriculasKey, ctx.previous);
    toast.error(`${msg}: ${err?.message ?? "verifique a ligação ao Supabase."}`);
  };
  const settle = () => {
    invalidateSchoolData();
    return qc.invalidateQueries({ queryKey: matriculasKey });
  };

  const insert = useMutation({
    mutationFn: async ({ save }: { aluno: T; save: () => Promise<unknown> }) => save(),
    onMutate: ({ aluno }) => optimistic((rows) => [...rows, aluno])(),
    onError: rollback("A matrícula não foi gravada"),
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: async ({ id, changes }: { id: string; changes: Partial<T> }) => {
      const { error } = await dbFrom("matriculas").update(changes as any).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, changes }) => optimistic((rows) => rows.map((r) => (r.id === id ? { ...r, ...changes } : r)))(),
    onError: rollback("Alteração não gravada"),
    onSuccess: () => toast.success("Aluno actualizado."),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await dbFrom("matriculas").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => optimistic((rows) => rows.filter((r) => r.id !== id))(),
    onError: rollback("Aluno não eliminado"),
    onSuccess: () => toast.success("Aluno eliminado."),
    onSettled: settle,
  });

  return { insert, update, remove };
}

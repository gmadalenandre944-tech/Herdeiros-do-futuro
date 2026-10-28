import { useEffect, useState } from "react";
import { db as dbFrom } from "@/lib/db";
import { fetchBaseEscolar } from "@/lib/schoolData";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface TeacherTurma { id: string; nome: string; classe: string }
export interface TeacherDisciplina { id: string; nome: string }
export interface TeacherAssignment {
  turma: TeacherTurma;
  disciplina: TeacherDisciplina | null;
}

/** Resolves the current teacher's classes + subjects from professor_disciplinas. */
export function useTeacher() {
  const { user, loading: authLoading } = useAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [turmas, setTurmas] = useState<TeacherTurma[]>([]);
  const [disciplinas, setDisciplinas] = useState<TeacherDisciplina[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const ler = () => Promise.all([
          dbFrom("professor_disciplinas")
            .select("turma_id, disciplina_id")
            .eq("professor_id", user.id),
          fetchBaseEscolar(),
        ]);
        // Uma falha momentânea de rede tenta de novo antes de mostrar erro.
        let res = await ler().catch(() => null);
        if (!res || (res[0] as any).error) {
          await new Promise((r) => setTimeout(r, 600));
          res = await ler();
        }
        const [{ data: pd, error }, base] = res;
        if (error) throw error;
        const links = ((pd as any[]) ?? []);
        const turmaIds = new Set(links.map((x) => String(x?.turma_id ?? "")).filter(Boolean));
        const discIds = new Set(links.map((x) => String(x?.disciplina_id ?? "")).filter(Boolean));
        const ts = (base.turmas as TeacherTurma[]).filter((turma) => turmaIds.has(turma.id));
        const ds = (base.disciplinas as TeacherDisciplina[]).filter((disciplina) => discIds.has(disciplina.id));
        const asg: TeacherAssignment[] = links.map((link: any) => {
          const turmaId = String(link?.turma_id ?? "");
          const disciplinaId = String(link?.disciplina_id ?? "");
          return {
            turma: ts.find((turma) => turma.id === turmaId) ?? { id: turmaId, nome: "Turma", classe: "" },
            disciplina: ds.find((disciplina) => disciplina.id === disciplinaId) ?? null,
          };
        }).filter((assignment) => assignment.turma.id);
        if (!active) return;
        setAssignments(asg);
        setTurmas(ts);
        setDisciplinas(ds);
      } catch (error: any) {
        console.error("[useTeacher] não foi possível carregar as atribuições:", error);
        if (active) {
          setAssignments([]);
          setTurmas([]);
          setDisciplinas([]);
          toast.error(`Não foi possível carregar as turmas e disciplinas: ${error?.message ?? "tente novamente."}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, authLoading]);

  return { user, loading, assignments, turmas, disciplinas };
}

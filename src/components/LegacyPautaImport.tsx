import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db as dbFrom } from "@/lib/db";
import { fetchMatriculas, type Matricula } from "@/lib/schoolData";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Database, Loader2 } from "lucide-react";

type LegacyStudent = { id: string; nome: string; notas: Record<string, string> };
type LegacyGroup = {
  origem: "primario" | "ciclo";
  turma: string;
  ano: string;
  periodo: string;
  disciplinas: string[];
  alunos: LegacyStudent[];
};

const clean = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase()
  .replace(/\s+/g, " ")
  .trim();

const classKey = (value: unknown) => {
  const normalized = clean(value);
  const match = normalized.match(/(?:iniciacao|[0-9]+\s*(?:a|ª|o|º)?\s*classe)/);
  return match?.[0]?.replace(/\s+/g, " ") ?? normalized;
};

const matchMatricula = (name: string, group: string, rows: Matricula[]) => {
  const wantedName = clean(name);
  const wantedGroup = clean(group);
  const wantedClass = classKey(group);
  const byNameAndClass = rows.filter((row) =>
    clean(row.nome) === wantedName &&
    (!row.classe || classKey(row.classe) === wantedClass || wantedGroup.includes(classKey(row.classe))),
  );
  if (byNameAndClass.length === 1) return byNameAndClass[0];
  const section = wantedGroup.replace(wantedClass, "").trim().split(" ").filter(Boolean).at(-1) ?? "";
  const bySection = byNameAndClass.filter((row) => {
    const candidate = clean(row.turma);
    return candidate && (candidate === section || candidate.endsWith(section) || section.endsWith(candidate));
  });
  return bySection.length === 1 ? bySection[0] : null;
};

const readLegacyGroups = (): LegacyGroup[] => {
  let importedIds = new Set<string>();
  try {
    importedIds = new Set(JSON.parse(localStorage.getItem("pauta_supabase_imported_ids_v1") || "[]"));
  } catch {
    importedIds = new Set();
  }
  const config = [
    { origem: "primario" as const, turmaKey: "pauta_turma_primario", anoKey: "pauta_ano_primario", periodoKey: "pauta_periodo_primario", disciplinasKey: "pauta_disc_primario", alunosKey: "pauta_alunos_primario" },
    { origem: "ciclo" as const, turmaKey: "pauta_turma_ciclo", anoKey: "pauta_ano_ciclo", periodoKey: "pauta_periodo_ciclo", disciplinasKey: "pauta_disc_ciclo", alunosKey: "pauta_alunos_ciclo" },
  ];
  return config.flatMap((keys) => {
    try {
      const students = JSON.parse(localStorage.getItem(keys.alunosKey) || "[]");
      const subjects = JSON.parse(localStorage.getItem(keys.disciplinasKey) || "[]");
      if (!Array.isArray(students) || !Array.isArray(subjects)) return [];
      const alunos = students.filter((row): row is LegacyStudent =>
        row && row.id != null && String(row.nome ?? "").trim() && row.notas && typeof row.notas === "object",
      ).map((row) => ({
        id: String(row.id),
        nome: String(row.nome).trim(),
        notas: Object.fromEntries(Object.entries(row.notas).filter(([discipline]) =>
          !importedIds.has(`${keys.origem}:${row.id}:${discipline}`),
        )),
      }));
      if (!alunos.length) return [];
      return [{
        origem: keys.origem,
        turma: localStorage.getItem(keys.turmaKey) || "",
        ano: localStorage.getItem(keys.anoKey) || String(new Date().getFullYear()),
        periodo: localStorage.getItem(keys.periodoKey) || "1º Trimestre",
        disciplinas: subjects.map(String).filter(Boolean),
        alunos,
      }];
    } catch (error) {
      console.error(`[LegacyPautaImport] dados locais inválidos (${keys.origem}):`, error);
      return [];
    }
  });
};

const LegacyPautaImport = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<LegacyGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setGroups(readLegacyGroups());
  }, []);

  const entriesCount = groups.reduce((count, group) => count + group.alunos.reduce((sum, student) =>
    sum + group.disciplinas.filter((discipline) => {
      const raw = student.notas?.[discipline];
      return raw !== undefined && raw !== "" && Number.isFinite(Number(raw));
    }).length, 0), 0);

  const importLegacy = async () => {
    if (!user?.id) {
      toast.error("A sessão de utilizador não está disponível.");
      return;
    }
    setLoading(true);
    try {
      const matriculas = await fetchMatriculas();
      const proposals: any[] = [];
      let unmatched = 0;
      let invalid = 0;

      for (const group of groups) {
        const matchPeriod = group.periodo.match(/[1-3]/);
        if (!matchPeriod) {
          unmatched += group.alunos.reduce((sum, student) => sum +
            group.disciplinas.filter((discipline) => student.notas?.[discipline] !== undefined && student.notas?.[discipline] !== "").length, 0);
          continue;
        }
        const year = Number(group.ano);
        if (!Number.isInteger(year) || year < 2000) {
          invalid += group.alunos.length;
          continue;
        }
        for (const student of group.alunos) {
          const matricula = matchMatricula(student.nome, group.turma, matriculas);
          const marks = group.disciplinas.flatMap((discipline) => {
            const raw = student.notas?.[discipline];
            if (raw === undefined || raw === "") return [];
            const value = Number(raw);
            const max = group.origem === "primario" ? 10 : 20;
            if (!Number.isFinite(value) || value < 0 || value > max) {
              invalid += 1;
              return [];
            }
            if (!matricula) return [];
            const localId = `${group.origem}:${student.id}:${discipline}`;
            return [{
              aluno_id: Number(matricula.id),
              professor_id: user.id,
              classe: matricula.classe ?? group.turma,
              turma: matricula.turma ?? group.turma,
              disciplina: discipline,
              trimestre: String(Number(matchPeriod[0])),
              ano_letivo: year,
              av1: null,
              av2: null,
              pp: null,
              media_final: value,
              origem_local_id: localId,
            }];
          });
          proposals.push(...marks);
          if (!matricula) {
            unmatched += group.disciplinas.filter((discipline) => {
              const raw = student.notas?.[discipline];
              return raw !== undefined && raw !== "" && Number.isFinite(Number(raw));
            }).length;
          }
        }
      }
      if (!proposals.length) {
        toast.warning("Não há notas locais que possam ser ligadas com segurança a uma matrícula do Supabase.");
        return;
      }

      const sourceIds = [...new Set(proposals.map((row) => row.origem_local_id))];
      const { data: existing, error: existingError } = await dbFrom("mini_pautas")
        .select("origem_local_id")
        .in("origem_local_id", sourceIds);
      if (existingError) throw existingError;
      const existingIds = new Set(((existing as any[]) ?? []).map((row) => String(row.origem_local_id)));
      const missing = proposals.filter((row) => !existingIds.has(row.origem_local_id));
      for (let offset = 0; offset < missing.length; offset += 100) {
        const { error } = await dbFrom("mini_pautas").insert(missing.slice(offset, offset + 100));
        if (error) throw error;
      }

      const { data: verified, error: verifyError } = await dbFrom("mini_pautas")
        .select("origem_local_id")
        .in("origem_local_id", sourceIds);
      if (verifyError) throw verifyError;
      const verifiedIds = new Set(((verified as any[]) ?? []).map((row) => String(row.origem_local_id)));
      const confirmed = sourceIds.filter((id) => verifiedIds.has(id)).length;
      if (confirmed !== sourceIds.length) {
        throw new Error("O Supabase não confirmou todas as notas. Os dados do navegador foram mantidos para tentar novamente.");
      }
      try {
        const stored = JSON.parse(localStorage.getItem("pauta_supabase_imported_ids_v1") || "[]");
        const completed = new Set<string>(Array.isArray(stored) ? stored.map(String) : []);
        sourceIds.forEach((id) => completed.add(id));
        localStorage.setItem("pauta_supabase_imported_ids_v1", JSON.stringify([...completed]));
      } catch (storageError) {
        console.warn("[LegacyPautaImport] não foi possível guardar o marcador local; a importação já foi confirmada no Supabase.", storageError);
      }
      toast.success(`${missing.length} nota(s) copiadas e confirmadas no Supabase. A cópia local continua guardada.`);
      if (unmatched || invalid) {
        toast.warning(`${unmatched} nota(s) sem matrícula única e ${invalid} nota(s) inválidas ficaram no navegador.`);
      }
      setGroups(readLegacyGroups());
    } catch (error: any) {
      console.error("[LegacyPautaImport] importação não concluída:", error);
      const details = [error?.code, error?.message].filter(Boolean).join(" ").toLowerCase();
      const message = details.includes("origem_local_id") || details.includes("ano_letivo")
        ? "Aplique primeiro a migração supabase/migrations/20261008_sync_school_records.sql no Supabase."
        : error?.message ?? "Verifique as permissões e a ligação ao Supabase.";
      toast.error(`A pauta local não foi completamente copiada: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  if (entriesCount === 0) return null;

  return (
    <Card className="mb-5 border-amber-300 bg-amber-50/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Notas antigas neste navegador
        </CardTitle>
        <CardDescription>
          Encontradas {entriesCount} nota(s) local(is). A importação liga apenas alunos com uma matrícula correspondente; a cópia local não será apagada.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Button type="button" onClick={() => void importLegacy()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
          Copiar notas para o Supabase
        </Button>
      </CardContent>
    </Card>
  );
};

export default LegacyPautaImport;

import { useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { professorNav } from "@/lib/nav";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { useTeacher } from "@/hooks/useTeacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, History, Save, RefreshCw } from "lucide-react";
import { fetchMatriculas } from "@/lib/schoolData";

interface Aluno {
  id: string;
  nome: string;
  numeroProcesso: string;
}

interface NotaDraft {
  alunoId: string;
  id?: string;
  mac: string;
  pp: string;
  pt: string;
  media: number | null;
  raw?: any;
}

interface NotaHistorico {
  id: string;
  aluno_id?: string;
  aluno_nome?: string;
  disciplina?: string;
  trimestre?: number;
  ano_letivo?: number;
  acao?: string;
  valores_anteriores?: any;
  valores_novos?: any;
  created_at?: string;
}

const valueFrom = (row: any, keys: string[]) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== "") {
      return row[key];
    }
  }
  return null;
};

const asText = (value: unknown) => value === null || value === undefined ? "" : String(value);

const mediaOf = (mac: string, pp: string, pt: string) => {
  const values = [mac, pp, pt].map(Number);
  if ([mac, pp, pt].some((value) => value === "") || values.some((value) => Number.isNaN(value))) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeAluno = (row: any): Aluno => ({
  id: String(row?.id),
  nome: asText(valueFrom(row, ["nome_completo", "nome", "full_name", "name"])) || "Aluno sem nome",
  numeroProcesso: asText(valueFrom(row, ["numero_processo", "processo", "numero"])) || "—",
});

const normalizeNota = (row: any): NotaDraft => {
  const mac = asText(valueFrom(row, ["av1", "mac", "n1"]));
  const pp = asText(valueFrom(row, ["av2", "npp", "pp", "n2"]));
  const pt = asText(valueFrom(row, ["pp", "npt", "pt", "n3"]));
  return {
    alunoId: String(row?.aluno_id),
    id: row?.id ? String(row.id) : undefined,
    mac,
    pp,
    pt,
    media: row?.media_final === null || row?.media_final === undefined ? mediaOf(mac, pp, pt) : Number(row.media_final),
    raw: row,
  };
};

const snapshot = (note: NotaDraft) => ({
  av1: note.mac === "" ? null : Number(note.mac),
  av2: note.pp === "" ? null : Number(note.pp),
  pp: note.pt === "" ? null : Number(note.pt),
  media_final: note.media,
});

export default function ProfessorGrades() {
  const { user } = useAuth();
  const { loading: teacherLoading, assignments, turmas, disciplinas } = useTeacher();
  const [turmaId, setTurmaId] = useState("");
  const [disciplinaId, setDisciplinaId] = useState("");
  const [trimestre, setTrimestre] = useState("1");
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear());
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Record<string, NotaDraft>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("lancamento");
  const [historico, setHistorico] = useState<NotaHistorico[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  const disciplinasDaTurma = useMemo(() => {
    const ids = new Set(
      assignments.filter((assignment) => assignment.turma.id === turmaId && assignment.disciplina?.id)
        .map((assignment) => assignment.disciplina!.id),
    );
    return disciplinas.filter((disciplina) => ids.has(disciplina.id));
  }, [assignments, disciplinas, turmaId]);

  const turmaSelecionada = turmas.find((turma) => turma.id === turmaId);
  const disciplinaSelecionada = disciplinas.find((disciplina) => disciplina.id === disciplinaId);

  useEffect(() => {
    if (!turmaId && turmas[0]) setTurmaId(turmas[0].id);
  }, [turmaId, turmas]);

  useEffect(() => {
    if (disciplinaId && disciplinasDaTurma.some((disciplina) => disciplina.id === disciplinaId)) return;
    setDisciplinaId(disciplinasDaTurma[0]?.id ?? "");
  }, [disciplinaId, disciplinasDaTurma]);

  useEffect(() => {
    if (!turmaId || !disciplinaSelecionada) {
      setAlunos([]);
      setNotas({});
      return;
    }
    let active = true;
    const carregar = async () => {
      setLoading(true);
      try {
        const list = (await fetchMatriculas())
          .filter((aluno) => aluno.turma_id === turmaId)
          .map((aluno) => normalizeAluno({
            id: aluno.id,
            nome_completo: aluno.nome,
            numero_processo: aluno.numero_processo,
          }));
        const { data: notasRaw, error: notasError } = list.length
          ? await dbFrom("mini_pautas")
            .select("*")
            .eq("disciplina", disciplinaSelecionada.nome)
            .eq("trimestre", String(Number(trimestre)))
            .eq("ano_letivo", anoLetivo)
            .in("aluno_id", list.map((aluno) => Number(aluno.id)))
          : { data: [], error: null };
        if (notasError) throw notasError;
        const byAluno: Record<string, NotaDraft> = {};
        list.forEach((aluno) => {
          byAluno[aluno.id] = { alunoId: aluno.id, mac: "", pp: "", pt: "", media: null };
        });
        ((notasRaw as any[]) ?? []).forEach((row) => {
          byAluno[row.aluno_id] = normalizeNota(row);
        });
        if (active) {
          setAlunos(list);
          setNotas(byAluno);
        }
      } catch (error: any) {
        console.error("[ProfessorGrades] falha ao carregar alunos/notas:", error);
        if (active) {
          setAlunos([]);
          setNotas({});
          toast.error(`Não foi possível carregar os alunos e notas: ${error?.message ?? "verifique a ligação ao Supabase."}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void carregar();
    return () => { active = false; };
  }, [anoLetivo, disciplinaSelecionada, trimestre, turmaId]);

  const loadHistory = async () => {
    if (!user) return;
    setHistoricoLoading(true);
    try {
      const { data, error } = await dbFrom("notas_historico")
        .select("*")
        .eq("professor_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      setHistorico((data ?? []) as NotaHistorico[]);
    } catch (error: any) {
      setHistorico([]);
      toast.error(`Não foi possível carregar o histórico no Supabase: ${error?.message ?? "erro desconhecido"}`);
    } finally {
      setHistoricoLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "historico") loadHistory();
  }, [tab, user]);

  const updateNota = (alunoId: string, field: "mac" | "pp" | "pt", value: string) => {
    if (value !== "") {
      const number = Number(value);
      if (Number.isNaN(number) || number < 0 || number > 20) {
        toast.error("A nota deve estar entre 0 e 20 valores.");
        return;
      }
    }
    setNotas((current) => {
      const previous = current[alunoId] ?? { alunoId, mac: "", pp: "", pt: "", media: null };
      const next = { ...previous, [field]: value };
      return { ...current, [alunoId]: { ...next, media: mediaOf(next.mac, next.pp, next.pt) } };
    });
  };

  const saveNotas = async () => {
    if (!user || !turmaId || !disciplinaSelecionada || !alunos.length) {
      toast.error("Selecione uma turma com alunos e uma disciplina.");
      return;
    }
    setSaving(true);
    let historyDbFailures = 0;
    let gradesSaved = 0;
    try {
      for (const aluno of alunos) {
        const draft = notas[aluno.id] ?? { alunoId: aluno.id, mac: "", pp: "", pt: "", media: null };
        const previous = draft.raw ? snapshot(normalizeNota(draft.raw)) : null;
        const payload: any = {
          aluno_id: Number(aluno.id),
          professor_id: user.id,
          classe: turmaSelecionada?.classe ?? "",
          turma: turmaSelecionada?.nome ?? "",
          disciplina: disciplinaSelecionada.nome,
          trimestre: String(Number(trimestre)),
          ano_letivo: anoLetivo,
          av1: draft.mac === "" ? null : Number(draft.mac),
          av2: draft.pp === "" ? null : Number(draft.pp),
          pp: draft.pt === "" ? null : Number(draft.pt),
          media_final: draft.media,
        };
        let savedId = draft.id;
        let error: any = null;
        if (draft.id) {
          const response = await dbFrom("mini_pautas").update(payload).eq("id", draft.id).select("id").maybeSingle();
          error = response.error;
          savedId = response.data?.id;
        } else {
          const response = await dbFrom("mini_pautas").insert(payload).select("id").single();
          error = response.error;
          savedId = response.data?.id;
        }
        if (error) throw new Error(error.message);
        if (!savedId) throw new Error(`O Supabase não confirmou a nota de ${aluno.nome}.`);
        gradesSaved += 1;
        const historyRow: any = {
          nota_id: savedId ?? null,
          aluno_id: aluno.id,
          aluno_nome: aluno.nome,
          professor_id: user.id,
          disciplina: disciplinaSelecionada.nome,
          trimestre: Number(trimestre),
          ano_letivo: anoLetivo,
          acao: draft.id ? "actualização" : "criação",
          valores_anteriores: previous,
          valores_novos: snapshot(draft),
        };
        const { error: historyError } = await dbFrom("notas_historico").insert(historyRow);
        if (historyError) historyDbFailures += 1;
      }
      if (historyDbFailures) {
        toast.error(`${gradesSaved} nota(s) foram gravadas, mas ${historyDbFailures} registo(s) do histórico falharam no Supabase; não foi criada cópia local.`);
      } else {
        toast.success("Notas e histórico guardados no Supabase.");
        setTab("historico");
        await loadHistory();
      }
    } catch (error: any) {
      const detail = error?.message || "erro desconhecido";
      toast.error(gradesSaved
        ? `${gradesSaved} nota(s) foram gravadas antes da falha: ${detail}`
        : `Não foi possível guardar as notas: ${detail}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Lançamento de Notas" navItems={professorNav}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="flex items-center gap-2 font-montserrat text-2xl font-bold lg:text-3xl">
            <BookOpen className="h-7 w-7 text-primary" /> Notas da Turma
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Lance novas notas, edite valores já guardados e consulte o histórico de alterações.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList>
            <TabsTrigger value="lancamento">Lançar / Editar notas</TabsTrigger>
            <TabsTrigger value="historico"><History className="mr-2 h-4 w-4" />Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="lancamento" className="space-y-5">
            <Card>
              <CardContent className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Turma</Label>
                  <Select value={turmaId} onValueChange={setTurmaId} disabled={teacherLoading}>
                    <SelectTrigger><SelectValue placeholder="Selecione a turma" /></SelectTrigger>
                    <SelectContent>{turmas.map((turma) => <SelectItem key={turma.id} value={turma.id}>{turma.nome} — {turma.classe}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Disciplina</Label>
                  <Select value={disciplinaId} onValueChange={setDisciplinaId} disabled={!turmaId}>
                    <SelectTrigger><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
                    <SelectContent>{disciplinasDaTurma.map((disciplina) => <SelectItem key={disciplina.id} value={disciplina.id}>{disciplina.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trimestre</Label>
                  <Select value={trimestre} onValueChange={setTrimestre}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1.º Trimestre</SelectItem>
                      <SelectItem value="2">2.º Trimestre</SelectItem>
                      <SelectItem value="3">3.º Trimestre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Ano letivo</Label>
                  <Input type="number" value={anoLetivo} onChange={(event) => setAnoLetivo(Number(event.target.value))} />
                </div>
              </CardContent>
            </Card>

            {!teacherLoading && !assignments.length && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">Nenhuma turma/disciplina foi atribuída a este professor.</CardContent></Card>
            )}

            {turmaSelecionada && disciplinaSelecionada && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{turmaSelecionada.nome} · {disciplinaSelecionada.nome} · {trimestre}.º trimestre · {anoLetivo}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="print-grid w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-border bg-secondary">
                          <th className="p-3 text-left">Processo</th>
                          <th className="p-3 text-left">Aluno</th>
                          <th className="p-3 text-center">MAC</th>
                          <th className="p-3 text-center">PP</th>
                          <th className="p-3 text-center">PT</th>
                          <th className="p-3 text-center">Média</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">A carregar alunos e notas...</td></tr>
                        ) : !alunos.length ? (
                          <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Não existem alunos ativos nesta turma.</td></tr>
                        ) : alunos.map((aluno) => {
                          const note = notas[aluno.id] ?? { alunoId: aluno.id, mac: "", pp: "", pt: "", media: null };
                          return (
                            <tr key={aluno.id} className="border-b border-border">
                              <td className="p-3 font-mono text-xs">{aluno.numeroProcesso}</td>
                              <td className="p-3 font-medium">{aluno.nome}</td>
                              {(["mac", "pp", "pt"] as const).map((field) => (
                                <td key={field} className="p-2">
                                  <Input
                                    type="number"
                                    min={0}
                                    max={20}
                                    step={0.1}
                                    value={note[field]}
                                    onChange={(event) => updateNota(aluno.id, field, event.target.value)}
                                    className="h-9 w-24 text-center"
                                  />
                                </td>
                              ))}
                              <td className="p-3 text-center font-semibold">{note.media === null ? "—" : note.media.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="outline" onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" />Recarregar</Button>
                    <Button onClick={saveNotas} disabled={saving || loading || !alunos.length}>
                      <Save className="mr-2 h-4 w-4" />{saving ? "A guardar..." : "Guardar / Atualizar notas"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico de alterações das notas</CardTitle></CardHeader>
              <CardContent>
                {historicoLoading ? <p className="text-sm text-muted-foreground">A carregar histórico...</p>
                  : !historico.length ? <p className="text-sm text-muted-foreground">Ainda não existem alterações registadas.</p>
                  : (
                    <div className="overflow-x-auto">
                      <table className="print-grid w-full min-w-[780px] text-sm">
                        <thead><tr className="border-b border-border bg-secondary">
                          <th className="p-3 text-left">Data</th><th className="p-3 text-left">Aluno</th><th className="p-3 text-left">Disciplina</th>
                          <th className="p-3 text-left">Período</th><th className="p-3 text-left">Ação</th><th className="p-3 text-left">Valores</th>
                        </tr></thead>
                        <tbody>{historico.map((item) => (
                          <tr key={item.id} className="border-b border-border">
                            <td className="p-3 whitespace-nowrap">{item.created_at ? new Date(item.created_at).toLocaleString("pt-AO") : "—"}</td>
                            <td className="p-3 font-medium">{item.aluno_nome || item.aluno_id || "—"}</td>
                            <td className="p-3">{item.disciplina || "—"}</td>
                            <td className="p-3">{item.trimestre ? `${item.trimestre}.º · ${item.ano_letivo}` : "—"}</td>
                            <td className="p-3 capitalize">{item.acao || "actualização"}</td>
                            <td className="p-3 font-mono text-xs">{JSON.stringify(item.valores_novos ?? {}).replace(/[{}"]/g, "") || "—"}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleLayout>
  );
}
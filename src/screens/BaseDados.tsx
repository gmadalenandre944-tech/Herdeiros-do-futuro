import { useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { useUserRole } from "@/hooks/useUserRole";
import { adminNav, secretarioNav, professorNav } from "@/lib/nav";
import { ANO_LETIVO_ATUAL, CLASSES_OFICIAIS, classeFromTurma, fetchAllStudentRecords, fetchBaseEscolar, normalizeClasseOficial, slugNome, turmaNomeFromTurma, type AlunoResolved, type Turma, type Disciplina } from "@/lib/schoolData";
import { db as dbFrom } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Database, Users, Layers, BookOpen, Printer, FileCheck2 } from "lucide-react";

type AcademicListRow = {
  id: string;
  nome: string;
  processo: string;
  classe: string;
  turma: string;
  ano: string;
  estado: string;
  origem: "Matrícula" | "Confirmação";
};

const firstValue = (row: any, keys: string[]) => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== "") {
      return String(row[key]).trim();
    }
  }
  return "";
};

const isAnoLetivo2026 = (row: any) => {
  const raw = firstValue(row, ["ano_letivo", "ano_lectivo", "ano_referencia", "ano", "year", "academic_year"]);
  // Aceita todos os anos lectivos para não esconder alunos da base de dados.
  void raw;
  return true;
};

const normalizeAcademicRows = (rows: any[], origem: AcademicListRow["origem"]) =>
  rows
    .filter(isAnoLetivo2026)
    .map((row, index) => {
      const rawTurma = firstValue(row, ["turma", "turma_nome", "section", "turma_id"]);
      const classeDaTurma = classeFromTurma(rawTurma);
      const classeExplicita = firstValue(row, ["classe", "grade_level", "classe_nome"]);
      const turmaNome = turmaNomeFromTurma(rawTurma);
      return {
      id: String(row?.id ?? `${origem}-${index}`),
      nome: firstValue(row, ["nome_completo", "aluno_nome", "nome", "full_name", "name"]) || "Aluno sem nome",
      processo: firstValue(row, ["numero_processo", "processo", "numero", "student_number"]) || "—",
      classe: classeDaTurma !== "Sem classe"
        ? classeDaTurma
        : classeExplicita
          ? normalizeClasseOficial(classeExplicita)
          : "—",
      turma: turmaNome || (classeDaTurma !== "Sem classe" ? "—" : rawTurma) || "—",
      ano: firstValue(row, ["ano_letivo", "ano_lectivo", "ano_referencia", "academic_year"]) || ANO_LETIVO_ATUAL,
      estado: firstValue(row, ["status", "estado"]) || "Registado",
      origem,
      };
    });

const classeDoRegistoAluno = (aluno: AlunoResolved) => {
  const fromTurma = classeFromTurma(aluno.raw?.turma);
  return fromTurma !== "Sem classe" ? fromTurma : normalizeClasseOficial(aluno.classe);
};

const BaseDados = () => {
  const { role } = useUserRole();
  const [alunos, setAlunos] = useState<AlunoResolved[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [busca, setBusca] = useState("");
  const [classeAlunoLista, setClasseAlunoLista] = useState("todas");
  const [loading, setLoading] = useState(true);
  const [matriculas, setMatriculas] = useState<AcademicListRow[]>([]);
  const [confirmacoes, setConfirmacoes] = useState<AcademicListRow[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState("");
  const [baseError, setBaseError] = useState("");
  const [classeLista, setClasseLista] = useState("todas");
  const [listaParaImprimir, setListaParaImprimir] = useState<"matriculas" | "confirmacoes">("matriculas");

  useEffect(() => {
    Promise.all([
      fetchBaseEscolar(),
      fetchAllStudentRecords()
        .then((data) => ({ data, error: null as any }))
        .catch((error) => ({ data: [] as any[], error })),
    ])
      .then(([base, studentResult]) => {
        if (studentResult.error) {
          console.error("[BaseDados] falha ao ler alunos do cadastro escolar:", studentResult.error);
          setBaseError(studentResult.error.message ?? "Não foi possível carregar todos os alunos do cadastro escolar.");
        }

        const registryRows = studentResult.data.map((row: any, index: number) => {
          const nome = String(row?.full_name ?? row?.nome_completo ?? row?.nome ?? "").trim();
          const nascimento = String(row?.birth_date ?? row?.data_nascimento ?? "").slice(0, 10);
          const turmaOriginal = String(row?.turma ?? row?.turma_nome ?? "").trim();
          const classeExplicita = String(row?.classe ?? row?.grade_level ?? "").trim();
          const classeCodificada = classeFromTurma(turmaOriginal);
          const classe = classeCodificada !== "Sem classe"
            ? classeCodificada
            : classeExplicita
              ? normalizeClasseOficial(classeExplicita)
              : "Sem classe";
          const turmaNome = String(row?.turma_nome ?? turmaNomeFromTurma(turmaOriginal)).trim();
          return {
            id: `students:${String(row?.id ?? index)}`,
            nome: nome || "Aluno sem nome",
            numero_processo: String(row?.numero_processo ?? row?.processo ?? ""),
            data_nascimento: nascimento || null,
            sexo: String(row?.gender ?? row?.sexo ?? "") || null,
            classe,
            turma_id: null,
            turma_nome: turmaNome || null,
            raw: row,
          } as AlunoResolved;
        });

        const processMap = new Map<string, AlunoResolved>();
        const identityMap = new Map<string, AlunoResolved>();
        const sharedIdMap = new Map<string, AlunoResolved>();
        const nameCounts = new Map<string, number>();
        for (const aluno of base.alunos) {
          if (aluno.id) sharedIdMap.set(String(aluno.id), aluno);
          const processo = String(aluno.numero_processo ?? "").trim();
          if (processo) processMap.set(processo, aluno);
          const nameKey = slugNome(aluno.nome);
          nameCounts.set(nameKey, (nameCounts.get(nameKey) ?? 0) + 1);
          if (aluno.data_nascimento) identityMap.set(`${nameKey}|${aluno.data_nascimento.slice(0, 10)}`, aluno);
        }

        const merged = [...base.alunos];
        for (const row of registryRows) {
          const process = String(row.numero_processo ?? "").trim();
          const nameKey = slugNome(row.nome);
          const identityKey = row.data_nascimento ? `${nameKey}|${row.data_nascimento}` : "";
          const sharedId = String(row.raw?.id ?? "");
          const existing = (sharedId && sharedIdMap.get(sharedId))
            || (process && processMap.get(process))
            || (identityKey && identityMap.get(identityKey))
            || (nameCounts.get(nameKey) === 1 ? base.alunos.find((aluno) => slugNome(aluno.nome) === nameKey) : undefined);
          if (existing) {
            if (row.classe !== "Sem classe") existing.classe = row.classe;
            if (row.turma_nome) existing.turma_nome = row.turma_nome;
            continue;
          }
          merged.push(row);
        }

        setAlunos(merged.sort((a, b) => a.nome.localeCompare(b.nome)));
        setTurmas(base.turmas);
        setDisciplinas(base.disciplinas);
      })
      .catch((error: any) => {
        console.error("[BaseDados] falha ao carregar a base escolar:", error);
        setBaseError(error?.message ?? "Não foi possível carregar a base escolar.");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    let active = true;
    const carregarListas = async () => {
      setListsLoading(true);
      setListsError("");
      const [matRes, confRes] = await Promise.all([
        dbFrom("matriculas").select("*").eq("ano_lectivo", ANO_LETIVO_ATUAL),
        dbFrom("confirmacoes").select("*").eq("ano_lectivo", ANO_LETIVO_ATUAL),
      ]);
      if (!active) return;
      const errors = [matRes.error, confRes.error].filter(Boolean);
      if (errors.length) {
        console.error("[BaseDados] falha ao ler listas académicas:", errors);
        setListsError("Não foi possível carregar uma ou mais listas. Verifique as permissões das tabelas matriculas e confirmacoes.");
      }
      setMatriculas(normalizeAcademicRows((matRes.data as any[]) ?? [], "Matrícula"));
      setConfirmacoes(normalizeAcademicRows((confRes.data as any[]) ?? [], "Confirmação"));
      setListsLoading(false);
    };
    carregarListas();
    return () => { active = false; };
  }, [role]);

  const q = slugNome(busca);
  const alunosFiltrados = alunos.filter(
    (a) => {
      const searchable = slugNome(`${a.nome} ${a.numero_processo ?? ""} ${a.turma_nome ?? ""} ${a.raw?.turma ?? ""}`);
      const matchesSearch = !q || searchable.includes(q);
      const matchesClass = classeAlunoLista === "todas" || classeDoRegistoAluno(a) === classeAlunoLista;
      return matchesSearch && matchesClass;
    },
  );

  const navMap: any = { admin: adminNav, secretario: secretarioNav, professor: professorNav };
  const nav = navMap[role || ""] ?? adminNav;
  const classesDasListas = useMemo(
    () => [...new Set([...matriculas, ...confirmacoes].map((row) => row.classe).filter((value) => value && value !== "—"))].sort(),
    [matriculas, confirmacoes],
  );
  const classesAlunos = useMemo(() => {
    const presentes = new Set(alunos.map(classeDoRegistoAluno).filter((classe) => classe !== "Sem classe"));
    return [
      ...CLASSES_OFICIAIS.filter((classe) => presentes.has(classe)),
      ...[...presentes].filter((classe) => !CLASSES_OFICIAIS.includes(classe as any)).sort((a, b) => a.localeCompare(b)),
    ];
  }, [alunos]);
  const filtrarLista = (rows: AcademicListRow[]) =>
    classeLista === "todas" ? rows : rows.filter((row) => row.classe === classeLista);
  const matriculasFiltradas = filtrarLista(matriculas);
  const confirmacoesFiltradas = filtrarLista(confirmacoes);

  const imprimirLista = (tipo: "matriculas" | "confirmacoes") => {
    setListaParaImprimir(tipo);
    window.setTimeout(() => window.print(), 0);
  };

  const Stat = ({ icon: Icon, label, value }: any) => (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className="h-6 w-6 text-primary" />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Base de Dados" navItems={nav}>
      <div className="space-y-5">
        <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground flex items-center gap-2">
          <Database className="h-7 w-7 text-primary" /> Base de Dados Escolar
        </h1>
        {baseError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{baseError}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat icon={Users} label="Alunos" value={alunos.length} />
          <Stat icon={Layers} label="Turmas" value={turmas.length} />
          <Stat icon={BookOpen} label="Disciplinas" value={disciplinas.length} />
        </div>

        {role === "admin" && (
          <section className="space-y-4">
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                .academic-list-print, .academic-list-print * { visibility: visible !important; }
                .academic-list-print { position: absolute; inset: 0; width: 100%; padding: 24px; background: white; color: black; }
                .no-print { display: none !important; }
              }
            `}</style>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between no-print">
              <div>
                 <h2 className="flex items-center gap-2 text-xl font-bold">
                   <FileCheck2 className="h-5 w-5 text-primary" /> Listas do Ano Letivo {ANO_LETIVO_ATUAL}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Matrículas e confirmações consultadas diretamente nas tabelas académicas.
                </p>
              </div>
              <div className="w-full sm:w-64">
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="filtro-classe-listas">Filtrar por classe</label>
                <select
                  id="filtro-classe-listas"
                  value={classeLista}
                  onChange={(event) => setClasseLista(event.target.value)}
                  className="h-10 w-full rounded-full border border-input bg-background px-3 text-sm"
                >
                  <option value="todas">Todas as classes</option>
                  {classesDasListas.map((classe) => <option key={classe} value={classe}>{classe}</option>)}
                </select>
              </div>
            </div>

            {listsError && <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive no-print">{listsError}</p>}
            {listsLoading ? (
              <Card className="no-print"><CardContent className="p-6 text-sm text-muted-foreground">A carregar listas de 2026/2027...</CardContent></Card>
              ) : (
              <Tabs defaultValue="matriculas" className="space-y-4">
                <TabsList className="no-print">
                  <TabsTrigger value="matriculas">Matrículas ({matriculasFiltradas.length})</TabsTrigger>
                  <TabsTrigger value="confirmacoes">Confirmações ({confirmacoesFiltradas.length})</TabsTrigger>
                </TabsList>
                {(["matriculas", "confirmacoes"] as const).map((tipo) => {
                  const rows = tipo === "matriculas" ? matriculasFiltradas : confirmacoesFiltradas;
                  const titulo = tipo === "matriculas" ? "Lista de Matrículas" : "Lista de Confirmações";
                  return (
                    <TabsContent key={tipo} value={tipo} className="mt-0">
                      <Card className={listaParaImprimir === tipo ? "academic-list-print" : "no-print"}>
                        <CardContent className="space-y-4 p-4 sm:p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                               <h3 className="font-bold">{titulo} — {ANO_LETIVO_ATUAL}</h3>
                              <p className="text-xs text-muted-foreground">
                                Classe: {classeLista === "todas" ? "Todas" : classeLista} · Total: {rows.length}
                              </p>
                            </div>
                            <Button variant="outline" className="gap-2 no-print" onClick={() => imprimirLista(tipo)}>
                              <Printer className="h-4 w-4" /> Imprimir Lista
                            </Button>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[720px] text-sm">
                              <thead className="bg-muted/50">
                                <tr className="text-left">
                                  <th className="p-3">Nº</th>
                                  <th className="p-3">Aluno</th>
                                  <th className="p-3">Processo</th>
                                  <th className="p-3">Classe</th>
                                  <th className="p-3">Turma</th>
                                  <th className="p-3">Estado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rows.length === 0 ? (
                                  <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum registo encontrado para os filtros selecionados.</td></tr>
                                ) : rows.map((row, index) => (
                                  <tr key={row.id} className="border-t border-border">
                                    <td className="p-3">{index + 1}</td>
                                    <td className="p-3 font-medium">{row.nome}</td>
                                    <td className="p-3 font-mono text-xs">{row.processo}</td>
                                    <td className="p-3">{row.classe}</td>
                                    <td className="p-3">{row.turma}</td>
                                    <td className="p-3">{row.estado}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </section>
        )}

        {loading && <p className="text-sm text-muted-foreground">A carregar dados...</p>}
        {!loading && alunos.length === 0 && turmas.length === 0 && disciplinas.length === 0 && (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Nenhum registo devolvido pela base de dados. Verifique se as permissões de leitura
              (RLS) foram aplicadas — execute o ficheiro <strong>BASE_DADOS_FIX.sql</strong> no
              Supabase.
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="alunos">
          <TabsList>
            <TabsTrigger value="alunos">Alunos</TabsTrigger>
            <TabsTrigger value="turmas">Turmas</TabsTrigger>
            <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
          </TabsList>

          <TabsContent value="alunos" className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
              <Input
                placeholder="Pesquisar por nome, processo ou turma..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              <Select value={classeAlunoLista} onValueChange={setClasseAlunoLista}>
                <SelectTrigger aria-label="Filtrar alunos por classe">
                  <SelectValue placeholder="Todas as classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as classes</SelectItem>
                  {classesAlunos.map((classe) => <SelectItem key={classe} value={classe}>{classe}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Nome</th>
                      <th className="p-3">Classe</th>
                      <th className="p-3">Turma</th>
                      <th className="p-3">Nascimento</th>
                      <th className="p-3">Sexo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum aluno encontrado para estes filtros.</td>
                      </tr>
                    ) : alunosFiltrados.map((a) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="p-3 font-medium">{a.nome}</td>
                        <td className="p-3">{classeDoRegistoAluno(a)}</td>
                        <td className="p-3">{a.turma_nome ?? "—"}</td>
                        <td className="p-3">{a.data_nascimento ?? "—"}</td>
                        <td className="p-3">{a.sexo ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="turmas">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Turma</th>
                      <th className="p-3">Classe</th>
                      <th className="p-3">Turno</th>
                      <th className="p-3">Sala</th>
                      <th className="p-3">Ano Lectivo</th>
                      <th className="p-3">Alunos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turmas.map((t) => (
                      <tr key={t.id} className="border-t border-border">
                        <td className="p-3 font-medium">{t.nome}</td>
                        <td className="p-3">{t.classe ?? "—"}</td>
                        <td className="p-3">{t.turno ?? "—"}</td>
                        <td className="p-3">{t.sala ?? "—"}</td>
                        <td className="p-3">{t.ano_lectivo ?? "—"}</td>
                        <td className="p-3">{alunos.filter((a) => a.turma_id === t.id).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disciplinas">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-3">Disciplina</th>
                      <th className="p-3">Classe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {disciplinas.map((d) => (
                      <tr key={d.id} className="border-t border-border">
                        <td className="p-3 font-medium">{d.nome}</td>
                        <td className="p-3">{d.classe ?? "Todas"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleLayout>
  );
};

export default BaseDados;

import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { secretarioNav } from "@/lib/nav";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardList, FileSpreadsheet } from "lucide-react";
import { downloadExcel } from "@/lib/excelExport";
import { fetchAlunosPresenca, type LinhaListaOficial } from "@/lib/listasOficiais";
import { CLASSES_OFICIAIS, classeFromTurma, classesDaVista, fetchAllStudentRecords, fetchBaseEscolar, normalizeClasseOficial, slugNome } from "@/lib/schoolData";

interface Turma { id: string; nome: string; classe: string; }
interface Aluno { id: string; nome_completo: string; numero_processo: string; classe: string; turma_id: string | null; }
interface Nota { id: string; aluno_id: string; disciplina: string; trimestre: number; media: number | null; ano_letivo: number; }

const SecretarioLists = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [turmaId, setTurmaId] = useState("all");
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(false);
  const [presenca, setPresenca] = useState<LinhaListaOficial[]>([]);
  const [presClasse, setPresClasse] = useState("todas");
  const [presTitulo, setPresTitulo] = useState("");
  const [presDias, setPresDias] = useState("22");

  useEffect(() => {
    fetchAlunosPresenca().then(setPresenca).catch((e) => toast.error(`Falha ao carregar alunos para presenças: ${e?.message ?? e}`));
  }, []);

  const presFiltrada = presenca.filter((a) => presClasse === "todas" || a.classe === presClasse);
  const grupos = () => {
    const m = new Map<string, LinhaListaOficial[]>();
    presFiltrada.forEach((a) => { const k = `${a.classe} — ${a.turma}`; m.set(k, [...(m.get(k) ?? []), a]); });
    return [...m.entries()];
  };
  const nDias = Math.min(31, Math.max(1, Number(presDias) || 22));

  const imprimirPresenca = () => {
    if (!presFiltrada.length) return toast.error("Nenhum aluno para a lista de presença.");
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const dias = Array.from({ length: nDias }, (_, i) => i + 1);
    const folhas = grupos().map(([g, alunos]) => `<section><h1>Colégio Herdeiros do Futuro</h1><h2>Lista de Presença ${esc(presTitulo)}</h2><p>${esc(g)} · ${alunos.length} alunos</p>
      <table><thead><tr><th>Nº</th><th>Nome Completo</th>${dias.map((d) => `<th class="d">${d}</th>`).join("")}</tr></thead><tbody>
      ${alunos.map((a, i) => `<tr><td class="c">${i + 1}</td><td class="n">${esc(a.nome_completo)}</td>${dias.map(() => "<td></td>").join("")}</tr>`).join("")}
      </tbody></table><div class="sig"><div>O(A) Professor(a)</div><div>O(A) Secretário(a)</div></div></section>`).join("");
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita janelas pop-up para imprimir.");
    w.document.write(`<!doctype html><html lang="pt"><head><meta charset="utf-8"><title>Listas de Presença</title><style>
      @page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:10px;color:#000}section+section{break-before:page}
      h1{font-size:14px;text-align:center;margin:0}h2{font-size:12px;text-align:center;margin:3px 0}p{text-align:center;margin:2px 0 8px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:3px 4px;height:14px}th{background:#eee}.c{text-align:center}.d{width:16px;font-size:9px}.n{white-space:nowrap}
      .sig{margin-top:30px;display:flex;justify-content:space-around}.sig div{border-top:1px solid #000;width:200px;text-align:center;padding-top:4px}
    </style></head><body>${folhas}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  const excelPresenca = () => {
    if (!presFiltrada.length) return toast.error("Nenhum aluno para exportar.");
    const dias = Array.from({ length: nDias }, (_, i) => String(i + 1));
    downloadExcel("Lista_de_Presenca", "Presenças", [["Nº", "Nome Completo", "Classe", "Turma", ...dias], ...presFiltrada.map((a, i) => [i + 1, a.nome_completo, a.classe, a.turma, ...dias.map(() => "")])]);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [base, academicRows] = await Promise.all([fetchBaseEscolar(), fetchAllStudentRecords()]);
        if (cancelled) return;
        setTurmas(base.turmas as Turma[]);

        const academicById = new Map<string, any>();
        const academicByIdentity = new Map<string, any>();
        academicRows.forEach((row: any) => {
          if (row?.id != null) academicById.set(String(row.id), row);
          const name = slugNome(String(row?.full_name ?? row?.nome_completo ?? row?.nome ?? ""));
          const birthDate = String(row?.birth_date ?? row?.data_nascimento ?? "").slice(0, 10);
          if (name && birthDate) academicByIdentity.set(`${name}|${birthDate}`, row);
        });
        const list = base.alunos.map((aluno) => {
          const academic = academicById.get(String(aluno.id))
            ?? academicByIdentity.get(`${slugNome(aluno.nome)}|${String(aluno.data_nascimento ?? "").slice(0, 10)}`);
          const classeAcademica = classeFromTurma(academic?.turma);
          return {
            id: aluno.id,
            nome_completo: aluno.nome,
            numero_processo: String(aluno.numero_processo ?? ""),
            classe: classeAcademica !== "Sem classe"
              ? classeAcademica
              : normalizeClasseOficial(aluno.classe),
            turma_id: aluno.turma_id,
          };
        }).filter((aluno) => turmaId === "all" || aluno.turma_id === turmaId);

        const sortedList = list.sort((a, b) => {
          const rankA = ["Iniciação","1ª Classe","2ª Classe","3ª Classe","4ª Classe","5ª Classe","6ª Classe","7ª Classe","8ª Classe","9ª Classe"].indexOf(a.classe);
          const rankB = ["Iniciação","1ª Classe","2ª Classe","3ª Classe","4ª Classe","5ª Classe","6ª Classe","7ª Classe","8ª Classe","9ª Classe"].indexOf(b.classe);
          return (rankA < 0 ? 99 : rankA) - (rankB < 0 ? 99 : rankB) || a.nome_completo.localeCompare(b.nome_completo);
        });
        setAlunos(sortedList as Aluno[]);
        if (sortedList.length) {
          const { data: nts, error } = await supabase
            .from("mini_pautas" as any)
            .select("*")
            .in("aluno_id", sortedList.map((a) => Number(a.id)));
          if (error) throw error;
          if (!cancelled) setNotas(((nts as any[]) ?? []).map((row) => ({
            ...row,
            aluno_id: String(row.aluno_id),
            media: row.media_final == null ? null : Number(row.media_final),
          })) as Nota[]);
        } else {
          setNotas([]);
        }
      } catch (error: any) {
        console.error("[SecretarioLists] falha ao carregar listagem:", error);
        if (!cancelled) {
          setAlunos([]);
          setNotas([]);
          toast.error(`Não foi possível carregar a listagem: ${error?.message ?? "verifique a ligação ao Supabase."}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [turmaId]);

  return (
    <RoleLayout title="Secretaria" subtitle="Herdeiros do Futuro" headerLabel="Listagens" navItems={secretarioNav}>
      <div className="space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Listagens & Validação Académica</h1>
          <p className="text-muted-foreground mt-1 text-sm">Visualize alunos e validez de notas lançadas pelos professores.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" /> Listas de Presença</h2>
            <p className="text-sm text-muted-foreground">Inclui automaticamente todos os alunos matriculados e confirmados ({presenca.length} na base de dados).</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-4 items-end">
            <div><Label>Classe</Label>
              <Select value={presClasse} onValueChange={setPresClasse}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="todas">Todas as classes</SelectItem>{(presenca.length ? classesDaVista(presenca) : [...CLASSES_OFICIAIS]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>

              </Select>
            </div>
            <div><Label>Mês / período</Label><Input className="mt-2" value={presTitulo} onChange={(e) => setPresTitulo(e.target.value)} placeholder="Ex.: Outubro 2026" /></div>
            <div><Label>Nº de dias</Label><Input className="mt-2" type="number" min={1} max={31} value={presDias} onChange={(e) => setPresDias(e.target.value)} /></div>
            <div className="flex gap-2">
              <Button onClick={imprimirPresenca} className="gap-2"><ClipboardList className="h-4 w-4" /> Gerar folhas</Button>
              <Button variant="outline" onClick={excelPresenca} className="gap-2"><FileSpreadsheet className="h-4 w-4" /> Excel</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{presFiltrada.length} alunos em {grupos().length} turma(s) serão incluídos.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 max-w-md">
          <Label>Turma</Label>
          <Select value={turmaId} onValueChange={setTurmaId}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as turmas</SelectItem>
              {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome} — {t.classe}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-secondary">
              <th className="text-left px-4 py-3 font-semibold">Processo</th>
              <th className="text-left px-4 py-3 font-semibold">Aluno</th>
              <th className="text-left px-4 py-3 font-semibold">Classe</th>
              <th className="text-center px-4 py-3 font-semibold">Disciplinas com nota</th>
              <th className="text-center px-4 py-3 font-semibold">Média Geral</th>
            </tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>
              ) : alunos.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum aluno encontrado.</td></tr>
              ) : alunos.map((a) => {
                const ns = notas.filter((n) => n.aluno_id === a.id && n.media !== null);
                const disciplinas = new Set(ns.map((n) => n.disciplina)).size;
                const med = ns.length ? ns.reduce((s, n) => s + Number(n.media), 0) / ns.length : null;
                return (
                  <tr key={a.id} className="border-b border-border hover:bg-secondary/50">
                    <td className="px-4 py-3 font-mono text-xs">{a.numero_processo}</td>
                    <td className="px-4 py-3 font-medium">{a.nome_completo}</td>
                    <td className="px-4 py-3">{a.classe}</td>
                    <td className="px-4 py-3 text-center">{disciplinas}</td>
                    <td className={`px-4 py-3 text-center font-bold ${med !== null && med < 10 ? "text-destructive" : ""}`}>{med !== null ? med.toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </RoleLayout>
  );
};

export default SecretarioLists;

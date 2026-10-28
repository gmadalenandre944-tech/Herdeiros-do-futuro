import { corNota } from "@/lib/corNota";
import { useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Printer, FileDown, Calculator, Loader2, GraduationCap, History, Trash2, FolderDown } from "lucide-react";
import { professorNav } from "@/lib/nav";
import { ANO_LETIVO_ANTERIOR, CLASSES_OFICIAIS, TODAS_TURMAS, classesDaVista, fetchMatriculasDaVista, filtrarPorClasseTurma, turmasDaClasse, type Matricula } from "@/lib/schoolData";

import { downloadElementPdf } from "@/lib/elementPdf";
import { downloadExcel } from "@/lib/excelExport";
import { disciplinasDaClasse } from "@/lib/officialDocs";
import { INSIGNIA } from "@/lib/insignia";

interface Linha {
  alunoId: string;
  nome: string;
  processo: string;
  mac: string;
  npt: string;
  /** Notas dos três trimestres (modo "todos"). */
  t?: Record<string, { mac: string; npt: string }>;
}

const PRIMARIA = ["Iniciação", "1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"];
const CICLO1 = ["7ª Classe", "8ª Classe", "9ª Classe"];
const TRIMESTRES = ["1", "2", "3"];
const TODOS = "todos";
const mtDe = (x?: { mac: string; npt: string }) => {
  if (!x) return null; const a = num(x.mac); const b = num(x.npt);
  return a === null || b === null || Number.isNaN(a) || Number.isNaN(b) ? null : (a + b) / 2;
};

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const idDb = (id: string) => (Number.isNaN(Number(id)) ? id : Number(id));

export default function MiniPauta() {
  const { user } = useAuth();
  const [classe, setClasse] = useState("");
  const [turma, setTurma] = useState(TODAS_TURMAS);
  const [vista, setVista] = useState<Matricula[]>([]);
  const turmaNome = turma === TODAS_TURMAS ? "Turma Única" : `${classe.replace(/ª Classe$/, "")}${turma}`;
  const [disciplina, setDisciplina] = useState("");
  const [trimestre, setTrimestre] = useState("1");
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loading, setLoading] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [tentarDeNovo, setTentarDeNovo] = useState(0);
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  // Classes lidas de `alunos_ordenados` (vista vw_alunos_ordenados), na ordem oficial.
  const classesExistentes = useMemo(() => (vista.length ? classesDaVista(vista) : [...CLASSES_OFICIAIS]), [vista]);

  // Carrega os alunos uma vez, para listar as classes que realmente existem.
  useEffect(() => {
    let activo = true;
    fetchMatriculasDaVista()
      .then((todos) => { if (activo) setVista(todos); })
      .catch(() => { if (activo) setVista([]); });
    return () => { activo = false; };
  }, [tentarDeNovo]);

  useEffect(() => { void carregarHistorico(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps


  const max = PRIMARIA.includes(classe) ? 10 : 20;
  const minimo = max / 2;

  const todos = trimestre === TODOS;
  const media = (l: Linha) => {
    if (l.t) {
      const ms = TRIMESTRES.map((t) => mtDe(l.t![t]));
      return ms.some((m) => m === null) ? null : (ms as number[]).reduce((s, v) => s + v, 0) / 3;
    }
    const vals = [num(l.mac), num(l.npt)];
    if (vals.some((v) => v === null || Number.isNaN(v))) return null;
    return (vals as number[]).reduce((s, v) => s + v, 0) / 2;
  };

  const disciplinasMatriz = useMemo(
    () => disciplinasDaClasse(classe),
    [classe],
  );

  // Alunos da classe (ordem alfabética) + notas já gravadas.
  useEffect(() => {
    if (!classe) { setLinhas([]); setErroCarga(null); return; }
    let activo = true;
    setLoading(true);
    setErroCarga(null);
    void (async () => {
      try {
        const todos = vista.length ? vista : await fetchMatriculasDaVista();
        if (!vista.length && activo) setVista(todos);
        const alunos = filtrarPorClasseTurma(todos, classe, turma)
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
        const base: Linha[] = alunos.map((a) => ({
          alunoId: a.id, nome: a.nome, processo: String(a.numero_processo ?? ""), mac: "", npt: "",
        }));
        if (disciplina.trim() && alunos.length) {
          const { data, error } = await dbFrom("mini_pautas")
            .select("aluno_id, av1, av2, pp, trimestre")
            .eq("classe", classe)
            .eq("disciplina", disciplina.trim())
            .in("trimestre", trimestre === TODOS ? TRIMESTRES : [trimestre])
            .in("aluno_id", alunos.map((a) => idDb(a.id)));
          if (error) throw error;
          if (trimestre === TODOS) {
            base.forEach((l) => { l.t = { "1": { mac: "", npt: "" }, "2": { mac: "", npt: "" }, "3": { mac: "", npt: "" } }; });
            const porId = new Map(base.map((l) => [l.alunoId, l]));
            ((data ?? []) as any[]).forEach((r) => {
              const l = porId.get(String(r.aluno_id)); const k = String(r.trimestre);
              if (l?.t?.[k]) l.t[k] = { mac: r.av1?.toString() ?? "", npt: r.pp?.toString() ?? "" };
            });
            if (activo) setLinhas(base);
            return;
          }
          const porAluno = new Map(((data ?? []) as any[]).map((r) => [String(r.aluno_id), r]));
          base.forEach((l) => {
            const r = porAluno.get(l.alunoId);
            if (r) { l.mac = r.av1?.toString() ?? ""; l.npt = r.pp?.toString() ?? ""; }
          });
        }
        if (activo) setLinhas(base);
      } catch (e: any) {
        if (activo) {
          setLinhas([]);
          setErroCarga(e?.message ?? "erro de ligação");
        }
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => { activo = false; };
  }, [classe, turma, disciplina, trimestre, tentarDeNovo]); // eslint-disable-line react-hooks/exhaustive-deps

  const resumo = useMemo(() => {
    const medias = linhas.map(media).filter((m): m is number => m !== null);
    return {
      lancados: medias.length,
      aprovados: medias.filter((m) => m >= minimo).length,
      mediaTurma: medias.length ? medias.reduce((s, m) => s + m, 0) / medias.length : null,
    };
  }, [linhas, minimo]);

  const editar = (i: number, campo: "mac" | "npt", v: string) => {
    if (v !== "" && !/^\d{0,2}([.,]\d{0,2})?$/.test(v)) return;
    if (v !== "" && Number(v.replace(",", ".")) > max) return toast.error(`A nota máxima é ${max}.`);
    setLinhas((prev) => prev.map((l, idx) => (idx === i ? { ...l, [campo]: v } : l)));
  };

  const gravar = async () => {
    if (todos) return toast.error("Para gravar, escolha um trimestre (1º, 2º ou 3º).");
    if (!classe || !disciplina.trim()) return toast.error("Escolha a classe e a disciplina.");
    const completas = linhas.filter((l) => media(l) !== null);
    if (!completas.length) return toast.error("Preencha MAC e NPT de pelo menos um aluno.");
    setSaving(true);
    try {
      const ids = completas.map((l) => idDb(l.alunoId));
      const del = await dbFrom("mini_pautas").delete()
        .eq("classe", classe).eq("disciplina", disciplina.trim()).eq("trimestre", trimestre).in("aluno_id", ids);
      if (del.error) throw del.error;
      const { error } = await dbFrom("mini_pautas").insert(completas.map((l) => ({
        professor_id: user?.id ?? null,
        classe,
        turma: turmaNome,
        disciplina: disciplina.trim(),
        trimestre,
        aluno_id: idDb(l.alunoId),
        av1: num(l.mac),
        av2: null,
        pp: num(l.npt),
        media_final: Number((media(l) as number).toFixed(2)),
      })));
      if (error) throw error;
      toast.success(`Mini pauta gravada: ${completas.length} aluno(s).`);
    } catch (e: any) {
      toast.error(`Não foi possível gravar: ${e?.message ?? "erro de ligação"}`);
    } finally {
      setSaving(false);
    }
  };

  const tabela = () => ({
    head: ["Nº", "Nome do Aluno", "MAC", "NPT", "MT", "Resultado"],
    body: linhas.map((l, i) => {
      const m = media(l);
      return [i + 1, l.nome, l.mac || "—", l.npt || "—", m === null ? "—" : m.toFixed(1), m === null ? "—" : m >= minimo ? "Transita" : "Não transita"];
    }),
  });

  const baixarExcel = () => {
    if (!linhas.length) return toast.error("Não há alunos para exportar.");
    const t = tabela();
    downloadExcel(`mini-pauta-${classe}-${disciplina}-T${trimestre === TODOS ? "1-3" : trimestre}`.replace(/\s+/g, "-"), "Mini Pauta", [
      ["Complexo Escolar Privado Herdeiros do Futuro — MINI PAUTA"],
      [`Classe: ${classe}`, `Turma: ${turmaNome}`, `Disciplina: ${disciplina || "—"}`, `${trimestre}º Trimestre`],
      [],
      t.head,
      ...t.body,
    ]);
  };

  const baixar = async () => {
    if (!linhas.length) return toast.error("Não há alunos para exportar.");
    try {
      await downloadElementPdf(".mp-doc", `mini-pauta-${classe}-${disciplina}-T${trimestre === TODOS ? "1-3" : trimestre}`.replace(/\s+/g, "-"), true);
    } catch (e: any) { toast.error(`Não foi possível gerar o PDF: ${e?.message ?? "erro"}`); }
  };

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Mini Pauta" navItems={professorNav}>
      <style>{`.mp-doc { display: none; } @media print { @page { size: A4 landscape; margin: 10mm; } body * { visibility: hidden !important; } .mp-doc, .mp-doc * { visibility: visible !important; } .mp-doc { display: block !important; position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } } .pauta-cor, .pauta-cor * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .pauta-cor thead th { background: var(--primary) !important; color: var(--primary-foreground) !important; }  .pauta-cor .titulo-cor { color: var(--primary); } .pauta-cor .nota-baixa { color: var(--destructive) !important; font-weight: 700; }`}</style>
      <PautaOficial
        classe={classe} turma={turmaNome} disciplina={disciplina} trimestre={trimestre}
        linhas={linhas} media={media} minimo={minimo}
      />
      <div className="space-y-6">
        <div className="no-print flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-montserrat text-2xl font-bold text-foreground lg:text-3xl">
              <Calculator className="h-7 w-7 text-primary" /> Calcular Mini Pauta
            </h1>
            <p className="text-sm text-muted-foreground">MT = (MAC + NPT) ÷ 2 · escala 0–{max} · mínimo para transitar {minimo}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void baixar()}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button>
            <Button variant="outline" onClick={baixarExcel}><FileDown className="mr-2 h-4 w-4" />Baixar Excel</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
            <Button onClick={() => void gravar()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Gravar
            </Button>
          </div>
        </div>

        <div className="no-print grid grid-cols-1 gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label>Classe</Label>
            <Select value={classe} onValueChange={(v) => { setClasse(v); setTurma(TODAS_TURMAS); }}>
              <SelectTrigger><SelectValue placeholder="Escolher classe" /></SelectTrigger>
              <SelectContent>{CLASSES_OFICIAIS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Turma</Label>
            <Select value={turma} onValueChange={setTurma} disabled={!classe}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={TODAS_TURMAS}>Todas as turmas</SelectItem>
                {turmasDaClasse(vista, classe).map((l) => <SelectItem key={l} value={l}>{classe.replace(/ª Classe$/, "")}{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Disciplina</Label>
            <Input list="mp-disciplinas" value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="Ex: Matemática" />
            <datalist id="mp-disciplinas">{disciplinasMatriz.map((d) => <option key={d} value={d} />)}</datalist>
          </div>
          <div className="space-y-2">
            <Label>Trimestre</Label>
            <Select value={trimestre} onValueChange={setTrimestre}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TRIMESTRES.map((t) => <SelectItem key={t} value={t}>{t}º Trimestre</SelectItem>)}<SelectItem value={TODOS}>Os três trimestres</SelectItem></SelectContent>
            </Select>
          </div>
        </div>

        <div id="printable-area" className="no-print overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-primary px-5 py-4 text-primary-foreground">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8" />
              <div>
                <p className="text-xs uppercase tracking-widest opacity-80">Colégio Herdeiros do Futuro</p>
                <p className="font-montserrat text-lg font-bold">Mini Pauta · {disciplina || "Disciplina"}</p>
              </div>
            </div>
            <p className="text-sm opacity-90">{classe || "Classe"} · {turmaNome} · {todos ? "1º, 2º e 3º Trimestres" : `${trimestre}º Trimestre`}</p>
          </div>

          <div className="grid grid-cols-3 divide-x divide-border border-b border-border text-center">
            <div className="p-3"><p className="text-xs text-muted-foreground">Notas lançadas</p><p className="text-xl font-bold text-foreground">{resumo.lancados}/{linhas.length}</p></div>
            <div className="p-3"><p className="text-xs text-muted-foreground">Transitam</p><p className="text-xl font-bold text-primary">{resumo.aprovados}</p></div>
            <div className="p-3"><p className="text-xs text-muted-foreground">Média da turma</p><p className="text-xl font-bold text-foreground">{resumo.mediaTurma === null ? "—" : resumo.mediaTurma.toFixed(1)}</p></div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary/60 text-muted-foreground">
                  <th className="w-12 px-3 py-2 text-left">Nº</th>
                  <th className="px-3 py-2 text-left">Nome do Aluno</th>
                  {todos ? <>{TRIMESTRES.map((t) => <th key={t} className="w-20 px-2 py-2 text-center">MT {t}º T</th>)}<th className="w-20 px-2 py-2 text-center">MF</th></> : <>
                  <th className="w-20 px-2 py-2 text-center">MAC</th>
                  <th className="w-20 px-2 py-2 text-center">NPT</th>
                  <th className="w-20 px-2 py-2 text-center">MT</th></>}
                  <th className="w-32 px-3 py-2 text-center">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={todos ? 7 : 6} className="p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
                ) : erroCarga ? (
                  <tr><td colSpan={todos ? 7 : 6} className="p-8 text-center">
                    <p className="font-medium text-destructive">Não foi possível carregar os alunos.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Verifique a internet. Detalhe: {erroCarga}</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => { setVista([]); setTentarDeNovo((n) => n + 1); }}>
                      Tentar de novo
                    </Button>
                  </td></tr>
                ) : linhas.length === 0 ? (
                  <tr><td colSpan={todos ? 7 : 6} className="p-8 text-center text-muted-foreground">{classe ? "Não há alunos nesta classe." : "Escolha uma classe para começar."}</td></tr>
                ) : linhas.map((l, i) => {
                  const m = media(l);
                  return (
                    <tr key={l.alunoId} className="border-t border-border/60 odd:bg-background even:bg-secondary/20">
                      <td className="px-3 py-1.5 font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                      <td className="px-3 py-1.5 font-medium text-foreground">{l.nome}</td>
                      {todos && TRIMESTRES.map((t) => { const v = mtDe(l.t?.[t]); return <td key={t} className={`px-2 py-1.5 text-center ${corNota(v, minimo)}`}>{v === null ? "—" : v.toFixed(1)}</td>; })}
                      {!todos && (["mac", "npt"] as const).map((c) => (
                        <td key={c} className="px-2 py-1.5">
                          <Input inputMode="decimal" value={l[c]} onChange={(e) => editar(i, c, e.target.value)} className="h-8 text-center" />
                        </td>
                      ))}
                      <td className={`px-2 py-1.5 text-center media-final ${m === null ? "text-muted-foreground" : corNota(m, minimo)}`}>
                        {m === null ? "—" : m.toFixed(1)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {m === null ? <span className="text-muted-foreground">—</span> : m >= minimo
                          ? <Badge>Transita</Badge>
                          : <Badge variant="destructive">Não transita</Badge>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleLayout>
  );
}

function PautaOficial({ classe, turma, disciplina, trimestre, linhas, media, minimo }: {
  classe: string; turma: string; disciplina: string; trimestre: string;
  linhas: Linha[]; media: (l: Linha) => number | null; minimo: number;
}) {
  const primaria = PRIMARIA.includes(classe);
  const ciclo1 = CICLO1.includes(classe);
  const titulo = primaria
    ? "MINI PAUTA DO ENSINO PRIMÁRIO"
    : ciclo1 ? "MINI PAUTA — I CICLO DO ENSINO SECUNDÁRIO" : "MINI PAUTA";
  const cel = "border border-foreground px-1 py-0.5";
  return (
    <div className="mp-doc pauta-cor text-[10px] leading-tight text-foreground">
      {trimestre === TODOS && <style>{`@media print { @page { size: A4 landscape; } }`}</style>}
      <div className="flex items-start justify-between">
        <div className="w-1/4 text-center">
          {!primaria && (<><p className="font-bold">VISTO</p><p>O DIRECTOR DA ESCOLA</p><p className="mt-4">______________________________</p></>)}
        </div>
        <div className="text-center font-bold uppercase">
          <img src={INSIGNIA} alt="Insígnia da República de Angola" className="insignia mx-auto mb-1 h-12" />
          <p>República de Angola</p>
          <p>Governo Provincial de Luanda</p>
          <p>Administração Municipal do Kilamba Kiaxi</p>
          <p>Direcção Municipal da Educação</p>
          <p className="titulo-cor mt-1">Complexo Escolar Privado Herdeiros do Futuro</p>
          <p className="titulo-cor mt-2 text-sm">{titulo}</p>
        </div>
        <div className="w-1/4" />
      </div>
      <p className="mt-3 font-semibold uppercase">
        Ano Lectivo: {ANO_LETIVO_ANTERIOR} &nbsp;&nbsp; Classe: {classe || "____"} &nbsp;&nbsp; Turma: {turma} &nbsp;&nbsp;
        Disciplina: {disciplina || "____"} &nbsp;&nbsp; {trimestre === TODOS ? "1º, 2º e 3º Trimestres" : `${trimestre}º Trimestre`} &nbsp;&nbsp; Município do Kilamba Kiaxi &nbsp;&nbsp; Província de Luanda
      </p>
      <table className="mt-2 w-full border-collapse">
        <thead>
          <tr className="font-bold">
            <th className={`${cel} w-8`}>Nº</th>
            <th className={`${cel} text-left`}>NOME COMPLETO</th>
            {trimestre === TODOS ? <>
              {TRIMESTRES.map((t) => ["MAC", "NPT", "MT"].map((h) => <th key={t + h} className={cel}>{h}<span className="block text-[8px] font-normal">{t}º T</span></th>))}
              <th className={`${cel} w-14`}>MF</th>
            </> : <>
            <th className={`${cel} w-16`}>MAC</th>
            <th className={`${cel} w-16`}>NPT</th>
            <th className={`${cel} w-16`}>MT</th></>}
            <th className={`${cel} w-32`}>OBSERVAÇÃO</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => {
            const m = media(l);
            return (
              <tr key={l.alunoId}>
                <td className={`${cel} text-center`}>{i + 1}</td>
                <td className={cel}>{l.nome}</td>
                {trimestre === TODOS ? TRIMESTRES.map((t) => { const x = l.t?.[t]; const mt = mtDe(x); return [
                  <td key={t + "a"} className={`${cel} text-center ${corNota(x?.mac, minimo)}`}>{x?.mac}</td>,
                  <td key={t + "b"} className={`${cel} text-center ${corNota(x?.npt, minimo)}`}>{x?.npt}</td>,
                  <td key={t + "c"} className={`${cel} text-center font-bold ${corNota(mt, minimo)}`}>{mt === null ? "" : mt.toFixed(1)}</td>,
                ]; }) : <>
                <td className={`${cel} text-center ${corNota(l.mac, minimo)}`}>{l.mac}</td>
                <td className={`${cel} text-center ${corNota(l.npt, minimo)}`}>{l.npt}</td></>}
                <td className={`${cel} text-center media-final ${corNota(m, minimo)}`}>{m === null ? "" : m.toFixed(1)}</td>
                <td className={`${cel} text-center ${m === null ? "" : m >= minimo ? "resultado-ok" : "resultado-mal"}`}>{m === null ? "" : m >= minimo ? "Transita" : "Não transita"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-4 text-center">Luanda, ____ de ________________ de ________</p>
      {primaria ? (
        <div className="mt-4 flex justify-between">
          <div><p className="font-bold">O CORPO DE JÚRI</p><p className="mt-2">1. ______________________________</p><p className="mt-2">2. ______________________________</p><p className="mt-2">3. ______________________________</p></div>
          <div className="text-center"><p className="font-bold">A SUBDIRECTORA PEDAGÓGICA</p><p className="mt-6">______________________________</p></div>
        </div>
      ) : (
        <div className="mt-4 flex justify-between">
          <div className="text-center"><p className="font-bold">O DIRECTOR DE TURMA</p><p className="mt-6">______________________________</p><p className="mt-1">Data: ____/____/______</p></div>
          <div className="text-center"><p className="font-bold">O SUBDIRECTOR PEDAGÓGICO</p><p className="mt-6">______________________________</p><p className="mt-1">Data: ____/____/______</p></div>
        </div>
      )}
    </div>
  );
}

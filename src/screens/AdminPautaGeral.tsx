import { corNota } from "@/lib/corNota";
import { useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { adminNav } from "@/lib/nav";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Calculator, Check, FileDown, GraduationCap, Pencil, Plus, Printer, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { downloadElementPdf } from "@/lib/elementPdf";
import { INSIGNIA } from "@/lib/insignia";
import { codigoTurma, fetchMatriculasDaVista, type Matricula } from "@/lib/schoolData";

type Ciclo = "primario" | "ciclo1";
interface AlunoPauta { id: string; nome: string; notas: Record<string, string> }
interface Quadro { turma: string; ano: string; periodo: string; disciplinas: string[]; alunos: AlunoPauta[] }

const CONFIG: Record<Ciclo, { label: string; titulo: string; max: number; min: number; disciplinas: string[]; turma: string }> = {
  primario: {
    label: "Ensino Primário (0-10)",
    titulo: "Quadro de Cálculo — Ensino Primário (Iniciação à 6ª Classe)",
    max: 10, min: 5, turma: "5A",
    disciplinas: ["Língua Portuguesa", "Matemática", "Ciências da Natureza", "História", "Geografia", "Educação Moral e Cívica", "Educação Manual e Plástica", "Educação Musical", "Educação Física", "Inglês"],
  },
  ciclo1: {
    label: "1º Ciclo (0-20)",
    titulo: "Quadro de Cálculo — 1º Ciclo (7ª à 9ª Classe)",
    max: 20, min: 10, turma: "7A",
    disciplinas: ["Língua Portuguesa", "Inglês", "Matemática", "Biologia", "Física", "Química", "Geografia", "História", "Educação Física", "Educação Moral e Cívica", "Educação Visual e Plástica", "Educação Laboral"],
  },
};
/** Inglês é obrigatório no primário a partir da 2ª classe. */
const semIngles = (turma: string) => /^\s*(inic|1\s*ª|1a\b|1º)/i.test(turma);
const comIngles = (c: Ciclo, turma: string, ds: string[]) => {
  const tem = ds.some((d) => /ingl/i.test(d));
  if (c === "primario" && semIngles(turma)) return ds.filter((d) => !/ingl/i.test(d));
  return tem ? ds : [...ds, "Inglês"];
};
const NE = (d: string) => `${d}|NE`;
const n = (v?: string) => (v === undefined || v === "" ? null : Number(v));
/** MF = (MFD + NE) ÷ 2 quando há exame; senão MF = MFD. */
const mfDe = (notas: Record<string, string>, d: string) => {
  const a = n(notas[d]); const b = n(notas[NE(d)]);
  if (a === null) return null;
  return b === null ? a : (a + b) / 2;
};
const PERIODOS = ["1º Trimestre", "2º Trimestre", "3º Trimestre", "Final"];

const novoQuadro = (c: Ciclo): Quadro => ({
  turma: CONFIG[c].turma, ano: String(new Date().getFullYear()), periodo: "1º Trimestre",
  disciplinas: [...CONFIG[c].disciplinas], alunos: [],
});
const lsKey = (c: Ciclo) => `pauta-geral:${c}`;
const uid = () => Math.random().toString(36).slice(2, 10);

export default function AdminPautaGeral() {
  return (
    <RoleLayout title="Future Roots" subtitle="Pauta Geral" headerLabel="Pauta Geral" navItems={adminNav}>
      <PautaCalculavel />
    </RoleLayout>
  );
}

/** Quadro calculável (primário / 1º ciclo) — usado pelo admin e pelo professor. */
export function PautaCalculavel() {
  const [ciclo, setCiclo] = useState<Ciclo>("primario");
  const [quadros, setQuadros] = useState<Record<Ciclo, Quadro>>({ primario: novoQuadro("primario"), ciclo1: novoQuadro("ciclo1") });
  const [novaDisc, setNovaDisc] = useState("");
  const [novoAluno, setNovoAluno] = useState("");
  const [busca, setBusca] = useState("");
  const [baseAlunos, setBaseAlunos] = useState<Matricula[]>([]);
  const [buscaBase, setBuscaBase] = useState("");
  useEffect(() => {
    fetchMatriculasDaVista().then(setBaseAlunos).catch((e) => toast.error(`Não foi possível ler os alunos: ${e?.message ?? "erro"}`));
  }, []);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const cfg = CONFIG[ciclo];
  const q = quadros[ciclo];
  const discs = useMemo(() => comIngles(ciclo, q.turma, q.disciplinas), [ciclo, q.turma, q.disciplinas]);

  useEffect(() => {
    // Carrega rascunhos locais
    const local: Partial<Record<Ciclo, Quadro>> = {};
    (["primario", "ciclo1"] as Ciclo[]).forEach((c) => {
      try { const v = localStorage.getItem(lsKey(c)); if (v) local[c] = JSON.parse(v); } catch { /* ignore */ }
    });
    if (Object.keys(local).length) setQuadros((p) => ({ ...p, ...local }));
  }, []);

  const update = (patch: Partial<Quadro>) => {
    setQuadros((prev) => {
      const next = { ...prev, [ciclo]: { ...prev[ciclo], ...patch } };
      localStorage.setItem(lsKey(ciclo), JSON.stringify(next[ciclo]));
      return next;
    });
  };

  const carregarDaBase = async () => {
    const { data, error } = await db("pautas_gerais").select("dados")
      .eq("ciclo", ciclo).eq("turma", q.turma).eq("ano_letivo", q.ano).eq("periodo", q.periodo).maybeSingle();
    if (error) return toast.error(`Não foi possível ler a pauta: ${error.message}`);
    if (!data) return toast.info("Ainda não existe pauta guardada para esta turma/período.");
    update({ disciplinas: data.dados.disciplinas ?? q.disciplinas, alunos: data.dados.alunos ?? [] });
    toast.success("Pauta carregada da base de dados.");
  };

  const guardar = async () => {
    setSaving(true);
    const { error } = await db("pautas_gerais").upsert({
      ciclo, turma: q.turma, ano_letivo: q.ano, periodo: q.periodo,
      dados: { disciplinas: discs, alunos: q.alunos }, updated_at: new Date().toISOString(),
    }, { onConflict: "ciclo,turma,ano_letivo,periodo" });
    setSaving(false);
    if (error) {
      toast.error(/pautas_gerais|PGRST205/.test(error.message + error.code)
        ? "A tabela de pautas ainda não existe na base de dados — a pauta ficou guardada só neste computador. Execute a migração 20261009."
        : `Erro ao guardar: ${error.message}`);
      return;
    }
    toast.success("Pauta guardada na base de dados.");
  };

  const media = (a: AlunoPauta) => {
    const vals = discs.map((d) => mfDe(a.notas, d)).filter((v): v is number => v !== null);
    if (vals.length < discs.length || !discs.length) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  };

  const stats = useMemo(() => {
    let ap = 0, rep = 0, pen = 0;
    q.alunos.forEach((a) => { const m = media(a); if (m == null) pen++; else if (m >= cfg.min) ap++; else rep++; });
    return { ap, rep, pen };
  }, [q, discs, cfg.min]);

  const setNota = (id: string, disc: string, v: string) => {
    if (v !== "" && (Number(v) < 0 || Number(v) > cfg.max)) return toast.error(`A nota deve estar entre 0 e ${cfg.max}.`);
    update({ alunos: q.alunos.map((a) => (a.id === id ? { ...a, notas: { ...a.notas, [disc]: v } } : a)) });
  };

  const guardarNome = (id: string) => {
    const n = editNome.trim();
    if (!n) return toast.error("O nome não pode ficar vazio.");
    update({ alunos: q.alunos.map((a) => (a.id === id ? { ...a, nome: n } : a)) });
    setEditId(null);
    toast.success("Nome atualizado. Carregue em Guardar na base de dados.");
  };

  const addDisc = () => {
    const n = novaDisc.trim();
    if (!n) return;
    if (q.disciplinas.includes(n)) return toast.error("Disciplina já existe.");
    update({ disciplinas: [...q.disciplinas, n] });
    setNovaDisc("");
  };
  const doCiclo = (a: Matricula) => {
    const n = Number(String(a.classe ?? "").match(/\d/)?.[0] ?? 0);
    return ciclo === "primario" ? n <= 6 : n >= 7;
  };
  const codigosTurma = useMemo(() => [...new Set(baseAlunos.filter(doCiclo).map(codigoTurma))].sort((a, b) => a.localeCompare(b, "pt", { numeric: true })), [baseAlunos, ciclo]); // eslint-disable-line react-hooks/exhaustive-deps
  const resultadosBase = useMemo(() => {
    const t = buscaBase.trim().toLowerCase();
    if (t.length < 2) return [];
    return baseAlunos.filter((a) => a.nome.toLowerCase().includes(t) || codigoTurma(a).toLowerCase() === t).slice(0, 30);
  }, [buscaBase, baseAlunos]);
  const juntarDaBase = (lista: Matricula[]) => {
    const existentes = new Set(q.alunos.map((a) => a.nome.toLowerCase()));
    const novos = lista.filter((a) => !existentes.has(a.nome.toLowerCase())).map((a) => ({ id: uid(), nome: a.nome, notas: {} }));
    if (!novos.length) return toast.info("Esse aluno já está na pauta.");
    update({ alunos: [...q.alunos, ...novos] });
    toast.success(`${novos.length} aluno(s) adicionado(s).`);
  };
  const carregarTurma = () => {
    const lista = baseAlunos.filter((a) => codigoTurma(a) === q.turma.trim()).sort((a, b) => a.nome.localeCompare(b.nome, "pt"));
    if (!lista.length) return toast.error("Não há alunos com essa turma na base de dados (ex: 5A, 6B).");
    juntarDaBase(lista);
  };
  const addAluno = () => {
    const n = novoAluno.trim();
    if (!n) return;
    update({ alunos: [...q.alunos, { id: uid(), nome: n, notas: {} }] });
    setNovoAluno("");
  };

  const estado = (m: number | null) => (m == null ? "Pendente" : m >= cfg.min ? "Aprovado" : "Reprovado");
  const linhasExport = () =>
    q.alunos.map((a, i) => {
      const m = media(a);
      return [i + 1, a.nome, ...discs.map((d) => { const v = mfDe(a.notas, d); return v === null ? "—" : v.toFixed(1); }), m == null ? "—" : m.toFixed(1), estado(m)];
    });

  const baixarPdf = async () => {
    if (!q.alunos.length) return toast.error("Registe pelo menos um aluno.");
    try {
      await downloadElementPdf(".pauta-doc", `pauta-geral-${q.turma}-${q.periodo}`.replace(/\s+/g, "-"), true);
    } catch (e: any) { toast.error(`Não foi possível gerar o PDF: ${e?.message ?? "erro"}`); }
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          @page { size: A4 landscape; margin: 8mm; }
          .pauta-doc, .pauta-doc * { visibility: visible !important; }
          .pauta-doc { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
        }
        .pauta-cor, .pauta-cor * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .pauta-cor thead th { background: var(--primary) !important; color: var(--primary-foreground) !important; }  .pauta-cor .titulo-cor { color: var(--primary); } .pauta-cor .nota-baixa { color: var(--destructive) !important; font-weight: 700; }
      `}</style>
      <div className="space-y-6">
        <div className="flex items-start gap-3 print:hidden">
          <Calculator className="mt-1 h-8 w-8 text-destructive" />
          <div>
            <h1 className="font-display text-2xl font-semibold text-foreground lg:text-3xl">Gestão de Pautas por Ciclo de Ensino</h1>
            <p className="text-sm text-muted-foreground">Quadros independentes para cálculo de notas do Ensino Primário e Primeiro Ciclo.</p>
          </div>
        </div>

        <Tabs value={ciclo} onValueChange={(v) => setCiclo(v as Ciclo)} className="print:hidden">
          <TabsList>
            <TabsTrigger value="primario" className="gap-2"><BookOpen className="h-4 w-4" />{CONFIG.primario.label}</TabsTrigger>
            <TabsTrigger value="ciclo1" className="gap-2"><GraduationCap className="h-4 w-4" />{CONFIG.ciclo1.label}</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-5 rounded-2xl border border-border bg-card p-5 print:hidden">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-primary"><BookOpen className="h-5 w-5" />{cfg.titulo}</h2>
            <p className="text-sm text-muted-foreground">Escala de notas de 0 a {cfg.max} valores. Nota mínima de aprovação: {cfg.min} valores.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>Turma / Classe *</Label><Input list="pg-turmas" placeholder="Ex: 6A" value={q.turma} onChange={(e) => update({ turma: e.target.value })} />
              <datalist id="pg-turmas">{codigosTurma.map((t) => <option key={t} value={t} />)}</datalist>
              <Button type="button" size="sm" variant="secondary" className="mt-1" onClick={carregarTurma}>Carregar alunos desta turma</Button></div>
            <div className="space-y-1.5"><Label>Ano Letivo *</Label><Input value={q.ano} onChange={(e) => update({ ano: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Período *</Label>
              <Select value={q.periodo} onValueChange={(v) => update({ periodo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PERIODOS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disciplinas</p>
            <div className="flex gap-2">
              <Input placeholder="Nova disciplina..." value={novaDisc} onChange={(e) => setNovaDisc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addDisc()} />
              <Button variant="secondary" onClick={addDisc}><Plus className="mr-1 h-4 w-4" />Adicionar</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {discs.map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">
                  {d}
                  <button aria-label={`Remover ${d}`} onClick={() => update({ disciplinas: q.disciplinas.filter((x) => x !== d) })}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registar Aluno</p>
            <div className="flex gap-2">
              <Input placeholder="Nome completo do aluno..." value={novoAluno} onChange={(e) => setNovoAluno(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addAluno()} />
              <Button variant="destructive" onClick={addAluno}><Plus className="mr-1 h-4 w-4" />Registar</Button>
            </div>
            <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pesquisar aluno na base de dados</p>
            <Input placeholder="Escreva o nome ou a turma (ex: 6A)..." value={buscaBase} onChange={(e) => setBuscaBase(e.target.value)} />
            {resultadosBase.length > 0 && (
              <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {resultadosBase.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>{a.nome} <span className="ml-2 rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold">{codigoTurma(a)}</span></span>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => juntarDaBase([a])}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
                  </li>
                ))}
              </ul>
            )}
            {buscaBase.trim().length >= 2 && !resultadosBase.length && <p className="text-xs text-muted-foreground">Nenhum aluno encontrado.</p>}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 print:hidden">
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-bold text-primary">{stats.ap}</p><p className="text-xs text-muted-foreground">Aprovados (≥ {cfg.min})</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-bold text-destructive">{stats.rep}</p><p className="text-xs text-muted-foreground">Reprovados (&lt; {cfg.min})</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-bold text-foreground">{stats.pen}</p><p className="text-xs text-muted-foreground">Pendentes</p></div>
        </div>

        <div className="flex flex-wrap gap-2 print:hidden">
          <Button onClick={guardar} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "A guardar..." : "Guardar na base de dados"}</Button>
          <Button variant="outline" onClick={carregarDaBase}>Carregar pauta guardada</Button>
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button variant="outline" onClick={() => void baixarPdf()}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button>
        </div>

        <PautaModelo ciclo={ciclo} q={q} discs={discs} media={media} min={cfg.min} />
        <div className="print:hidden">
          <Input placeholder="Pesquisar aluno pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="max-w-sm" />
        </div>
        <div className="print:hidden overflow-x-auto rounded-2xl border border-border bg-card">
          <div className="hidden p-2 print:block">
            <h2 className="text-lg font-bold">Colégio Herdeiros do Futuro — Pauta Geral</h2>
            <p className="text-sm">{cfg.titulo} · Turma: {q.turma} · Ano: {q.ano} · {q.periodo}</p>
          </div>
          <table className="print-grid w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary text-left">
                <th className="px-3 py-2">Nº</th>
                <th className="px-3 py-2">Nome do Aluno</th>
                {discs.map((d) => <th key={d} className="px-2 py-2 text-center">{d}<span className="block text-[10px] font-normal text-muted-foreground">MFD · NE</span></th>)}
                <th className="px-3 py-2 text-center">Média</th>
                <th className="px-3 py-2 text-center">Resultado</th>
                <th className="px-2 py-2 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {q.alunos.length === 0 ? (
                <tr><td colSpan={discs.length + 5} className="py-8 text-center text-muted-foreground">Nenhum aluno registado.</td></tr>
              ) : q.alunos.map((a, i) => {
                if (busca.trim() && !a.nome.toLowerCase().includes(busca.trim().toLowerCase())) return null;
                const m = media(a);
                const e = estado(m);
                return (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">
                      {editId === a.id ? (
                        <Input autoFocus value={editNome} onChange={(ev) => setEditNome(ev.target.value)} className="h-8 min-w-48"
                          onKeyDown={(ev) => { if (ev.key === "Enter") guardarNome(a.id); if (ev.key === "Escape") setEditId(null); }} />
                      ) : a.nome}
                    </td>
                    {discs.map((d) => (
                      <td key={d} className="px-1 py-1 text-center">
                        <div className="flex justify-center gap-1">
                          <Input aria-label={`${d} MFD`} type="number" min={0} max={cfg.max} step="0.1" value={a.notas[d] ?? ""} onChange={(ev) => setNota(a.id, d, ev.target.value)} className="h-8 w-14 text-center" />
                          <Input aria-label={`${d} NE`} type="number" min={0} max={cfg.max} step="0.1" value={a.notas[NE(d)] ?? ""} onChange={(ev) => setNota(a.id, NE(d), ev.target.value)} className="h-8 w-14 text-center" />
                        </div>
                        <span className={`mt-0.5 block rounded text-[11px] font-semibold ${corNota(mfDe(a.notas, d), cfg.min, cfg.max)}`}>
                          MF: {mfDe(a.notas, d)?.toFixed(1) ?? "—"}
                        </span>
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-center media-final ${corNota(m, cfg.min)}`}>{m == null ? "—" : m.toFixed(1)}</td>
                    <td className={`px-3 py-2 text-center text-xs font-semibold ${e === "Aprovado" ? "text-primary" : e === "Reprovado" ? "text-destructive" : "text-muted-foreground"}`}>{e}</td>
                    <td className="px-2 py-2 print:hidden">
                      <div className="flex items-center gap-1">
                        {editId === a.id ? (
                          <>
                            <Button size="sm" className="h-8" onClick={() => guardarNome(a.id)}><Check className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditId(null)} aria-label="Cancelar"><X className="h-3.5 w-3.5" /></Button>
                          </>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8" onClick={() => { setEditId(a.id); setEditNome(a.nome); }}><Pencil className="h-3.5 w-3.5" />Editar</Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-8 text-destructive" aria-label={`Eliminar ${a.nome}`}
                          onClick={() => { if (window.confirm(`Eliminar ${a.nome} da pauta?`)) update({ alunos: q.alunos.filter((x) => x.id !== a.id) }); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const ABREV: Record<string, string> = {
  "Língua Portuguesa": "L.PORTUGUESA", "Matemática": "MATEMÁTICA", "Ciências da Natureza": "C.DA NATUREZA",
  "Educação Moral e Cívica": "E.M.CÍVICA", "Educação Manual e Plástica": "E.M.PLÁSTICA", "Educação Musical": "E. MUSICAL",
  "Educação Física": "ED. FÍSICA", "Educação Visual e Plástica": "E.V.P", "Educação Laboral": "ED. LABORAL",
};

/** Modelo oficial impresso (pauta do primário / I ciclo), igual aos modelos da escola. */
function PautaModelo({ ciclo, q, discs, media, min }: {
  ciclo: Ciclo; q: Quadro; discs: string[]; media: (a: AlunoPauta) => number | null; min: number;
}) {
  const prim = ciclo === "primario";
  const numCol = prim ? "6036" : "6035";
  const c = "border border-foreground px-0.5 py-px text-center";
  const sub = prim ? ["MFD", "NE", "MF", "NER"] : ["MDF", "NE", "MF", "NER"];
  const f = (v: number | null) => (v === null ? "" : Number.isInteger(v) ? String(v) : v.toFixed(1));
  return (
    <div className="pauta-doc pauta-cor hidden text-[8px] leading-tight text-foreground">
      <div className="flex items-start justify-between">
        <div className="w-1/4 pt-4 text-center">
          <p>VISTO</p><p>O DIRECTOR DO COLÉGIO</p><p className="mt-3">______________________________</p>
          <p className="font-bold">Ermênio Pedro Quiala Lusambo</p>
        </div>
        <div className="text-center text-[10px] font-bold uppercase">
          <img src={INSIGNIA} alt="Insígnia da República de Angola" className="insignia mx-auto mb-1 h-12" />
          <p>República de Angola</p>
          <p>Governo da Província de Luanda</p>
          <p>Administração Municipal do Kilamba Kiaxi</p>
          <p>Direcção Municipal da Educação</p>
          <p className="mt-1"><span className="text-destructive">Colégio Público Nº {numCol}</span> <span className="ml-3 text-destructive">(Herdeiros do Futuro)</span></p>
                  </div>
        <div className="w-1/4" />
      </div>
      <table className="mt-2 w-full border-collapse font-semibold uppercase">
        <tbody>
          <tr><td className={`${c} text-[10px] font-bold`} rowSpan={3}>Colégio Público N. {numCol}</td><td className={`${c} font-bold`} colSpan={6}>{prim ? "E N S I N O &nbsp; P R I M Á R I O".replace(/&nbsp;/g, " ") : "I . C I C L O"}</td></tr>
          <tr><td className={c}>Classe / Turma</td><td className={c}>{q.turma}</td><td className={c}>Ano Lectivo</td><td className={c}>{q.ano}</td><td className={c}>Província</td><td className={c}>Luanda</td></tr>
          <tr><td className={c}>Período</td><td className={c}>{q.periodo}</td><td className={c} colSpan={2} /><td className={c}>Distrito</td><td className={c}>Urbano</td></tr>
        </tbody>
      </table>

      <table className="mt-2 w-full border-collapse">
        <thead className="font-bold">
          <tr>
            <th className={c} rowSpan={2}>Nº</th>
            <th className={`${c} text-left`} rowSpan={2}>NOME COMPLETO</th>
            {discs.map((d) => <th key={d} className={c} colSpan={4}>{ABREV[d] ?? d.toUpperCase()}</th>)}
            <th className={c} rowSpan={2}>MÉDIA</th>
            <th className={c} rowSpan={2}>{prim ? "OBSERVAÇÃO" : "RESULTADO"}</th>
          </tr>
          <tr>{discs.map((d) => sub.map((s) => <th key={d + s} className={c}>{s}</th>))}</tr>
        </thead>
        <tbody>
          {q.alunos.map((a, i) => {
            const m = media(a);
            return (
              <tr key={a.id}>
                <td className={c}>{i + 1}</td>
                <td className={`${c} whitespace-nowrap text-left`}>{a.nome}</td>
                {discs.map((d) => [
                  <td key={d + 1} className={`${c} ${corNota(a.notas[d], min)}`}>{a.notas[d] ?? ""}</td>,
                  <td key={d + 2} className={`${c} ${corNota(a.notas[NE(d)], min)}`}>{a.notas[NE(d)] ?? ""}</td>,
                  <td key={d + 3} className={`${c} media-final ${corNota(mfDe(a.notas, d), min, min * 2)}`}>{f(mfDe(a.notas, d))}</td>,
                  <td key={d + 4} className={c} />,
                ])}
                <td className={`${c} media-final ${corNota(m, min)}`}>{f(m === null ? null : Number(m.toFixed(1)))}</td>
                <td className={`${c} ${m === null ? "" : m >= min ? "resultado-ok" : "resultado-mal"}`}>{m === null ? "" : m >= min ? (prim ? "Transita" : "Apto") : (prim ? "Não transita" : "Não apto")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-center">Luanda, ____ de ________________ de ________</p>
      {prim ? (
        <div className="mt-3 flex justify-between">
          <div><p className="font-bold">O CORPO DE JÚRI</p><p className="mt-2">1. ______________________________</p><p className="mt-2">2. ______________________________</p><p className="mt-2">3. ______________________________</p></div>
          <div className="text-center"><p className="font-bold">A SUBDIRECTORA PEDAGÓGICA</p><p className="mt-5">______________________________</p><p className="mt-1">____/____/______</p></div>
        </div>
      ) : (
        <div className="mt-3 flex justify-between">
          <div className="text-center"><p className="font-bold">O DIRECTOR DE TURMA</p><p className="mt-5">______________________________</p><p className="mt-1">Data: ____/____/______</p></div>
          <div className="text-center"><p className="font-bold">O SUBDIRECTOR PEDAGÓGICO</p><p className="mt-5">______________________________</p><p className="mt-1">Data: ____/____/______</p></div>
        </div>
      )}
    </div>
  );
}

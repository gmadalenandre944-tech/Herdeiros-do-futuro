import { useEffect, useMemo, useState } from "react";
import { useOfficialRoster } from "@/hooks/useOfficialRoster";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, FileDown, RefreshCw, GraduationCap, Pencil, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { ANO_LETIVO_ATUAL } from "@/lib/schoolData";
import { agruparPorClasse, type LinhaListaOficial, type EdicaoLinha } from "@/lib/listasOficiais";
import { downloadTablesPdf } from "@/lib/pdfTables";
import type { StudentInsertInput } from "@/lib/students";
import { UserPlus } from "lucide-react";

function AdicionarAluno({ classe, onAdd, disabled }: { classe: string; onAdd: (input: StudentInsertInput & { numeroProcesso?: string }) => Promise<unknown>; disabled: boolean }) {
  const vazio = { nome: "", processo: "", idade: "", nascimento: "", genero: "", turma: "" };
  const [aberto, setAberto] = useState(false);
  const [f, setF] = useState(vazio);
  const [busy, setBusy] = useState(false);
  const guardar = async () => {
    if (!f.nome.trim()) return toast.error("Indique o nome completo.");
    const idade = f.idade === "" ? null : Number(f.idade);
    if (idade != null && (isNaN(idade) || idade < 1 || idade > 40)) return toast.error("Idade inválida.");
    setBusy(true);
    try {
      await onAdd({ fullName: f.nome, numeroProcesso: f.processo, idade, birthDate: f.nascimento, gender: f.genero, classe, turma: f.turma });
      toast.success(`${f.nome} adicionado à ${classe}.`);
      setF(vazio); setAberto(false);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  if (!aberto) return <Button size="sm" variant="outline" className="no-print h-8" onClick={() => setAberto(true)}><UserPlus className="h-3.5 w-3.5" />Adicionar aluno</Button>;
  return (
    <div className="no-print flex flex-wrap items-end gap-2 rounded-lg border border-border bg-muted/20 p-3">
      <Input className="h-8 w-28" placeholder="Nº processo" value={f.processo} onChange={(e) => setF({ ...f, processo: e.target.value })} />
      <Input className="h-8 min-w-48 flex-1" placeholder="Nome completo" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <Input type="number" className="h-8 w-20" placeholder="Idade" value={f.idade} onChange={(e) => setF({ ...f, idade: e.target.value })} />
      <Input type="date" className="h-8 w-40" aria-label="Data de nascimento" title="Data de nascimento" value={f.nascimento} onChange={(e) => setF({ ...f, nascimento: e.target.value })} />
      <Select value={f.genero || "none"} onValueChange={(v) => setF({ ...f, genero: v === "none" ? "" : v })}>
        <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Género" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Género</SelectItem>
          <SelectItem value="Masculino">Masculino</SelectItem>
          <SelectItem value="Feminino">Feminino</SelectItem>
        </SelectContent>
      </Select>
      <Input className="h-8 w-28" placeholder="Turma" value={f.turma} onChange={(e) => setF({ ...f, turma: e.target.value })} />
      <Button size="sm" className="h-8" onClick={guardar} disabled={busy || disabled}><Check className="h-3.5 w-3.5" />Guardar</Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={() => { setF(vazio); setAberto(false); }}><X className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

const HEAD = ["Nº", "Nº de Processo", "Nome Completo", "Idade", "Data de Nascimento", "Género", "Tipo de Movimento"];

function LinhaEditavel({ linha, n, onSave, onDelete, disabled }: {
  linha: LinhaListaOficial; n: number;
  onSave: (d: EdicaoLinha) => Promise<unknown>; onDelete: () => Promise<unknown>; disabled: boolean;
}) {
  const inicial = (): EdicaoLinha => ({ numero_processo: linha.numero_processo, nome_completo: linha.nome_completo, idade: linha.idade, data_nascimento: linha.data_nascimento, genero: linha.genero });
  const [editar, setEditar] = useState(false);
  const [d, setD] = useState<EdicaoLinha>(inicial);
  const [busy, setBusy] = useState(false);

  const guardar = async () => {
    if (!d.nome_completo.trim()) return toast.error("O nome não pode ficar vazio.");
    if (d.idade != null && (isNaN(d.idade) || d.idade < 1 || d.idade > 40)) return toast.error("Idade inválida.");
    setBusy(true);
    try {
      await onSave(d);
      setEditar(false);
      toast.success(`Dados de ${d.nome_completo} guardados.`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  const eliminar = async () => {
    if (!window.confirm(`Eliminar ${linha.tipo.toLowerCase()} de ${linha.nome_completo}? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try { await onDelete(); toast.success("Registo eliminado."); }
    catch (e: any) { toast.error(e.message); setBusy(false); }
  };

  if (editar) {
    return (
      <tr className="border-b border-border/40 bg-muted/20" onKeyDown={(e) => { if (e.key === "Enter") void guardar(); if (e.key === "Escape") setEditar(false); }}>
        <td className="p-2 text-xs text-muted-foreground">{n}</td>
        <td className="p-1"><Input autoFocus className="h-8 w-28" value={d.numero_processo} onChange={(e) => setD({ ...d, numero_processo: e.target.value })} aria-label="Nº de processo" /></td>
        <td className="p-1"><Input className="h-8 min-w-48" value={d.nome_completo} onChange={(e) => setD({ ...d, nome_completo: e.target.value })} aria-label="Nome completo" /></td>
        <td className="p-1"><Input type="number" className="h-8 w-20" value={d.idade ?? ""} onChange={(e) => setD({ ...d, idade: e.target.value === "" ? null : Number(e.target.value) })} aria-label="Idade" /></td>
        <td className="p-1"><Input type="date" className="h-8 w-40" value={d.data_nascimento} onChange={(e) => setD({ ...d, data_nascimento: e.target.value })} aria-label="Data de nascimento" /></td>
        <td className="p-1">
          <Select value={d.genero || "none"} onValueChange={(v) => setD({ ...d, genero: v === "none" ? "" : v })}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Feminino">Feminino</SelectItem>
            </SelectContent>
          </Select>
        </td>
        <td className="p-2"><Badge variant={linha.tipo === "Matrícula" ? "default" : "secondary"}>{linha.tipo}</Badge></td>
        <td className="no-print p-1">
          <div className="flex gap-1">
            <Button size="sm" className="h-8" onClick={guardar} disabled={busy || disabled}><Check className="h-3.5 w-3.5" />Guardar</Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setD(inicial()); setEditar(false); }} disabled={busy || disabled}><X className="h-3.5 w-3.5" /></Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-border/40">
      <td className="p-2 text-xs text-muted-foreground">{n}</td>
      <td className="p-2 font-mono text-xs">{linha.numero_processo || "—"}</td>
      <td className="p-2 font-medium">
        <button type="button" className="text-left underline-offset-2 hover:text-primary hover:underline" title="Clique para escrever idade, género e nº de processo" onClick={() => { setD(inicial()); setEditar(true); }}>{linha.nome_completo}</button>
      </td>
      <td className="p-2">{linha.idade ?? <span className="no-print text-xs italic text-muted-foreground">clique no nome</span>}</td>
      <td className="p-2">{linha.data_nascimento ? linha.data_nascimento.split("-").reverse().join("/") : "—"}</td>
      <td className="p-2">{linha.genero || "—"}</td>
      <td className="p-2"><Badge variant={linha.tipo === "Matrícula" ? "default" : "secondary"}>{linha.tipo}</Badge></td>
      <td className="no-print p-1">
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-8" onClick={() => { setD(inicial()); setEditar(true); }} disabled={busy || disabled}><Pencil className="h-3.5 w-3.5" />Editar</Button>
          <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={eliminar} disabled={busy || disabled} aria-label={`Eliminar ${linha.nome_completo}`}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </td>
    </tr>
  );
}

export default function ListaOficialPainel({ titulo = "Listas Oficiais" }: { titulo?: string }) {
  const { linhas, loading, refreshing, error, busy, refresh, add, update, remove } = useOfficialRoster();
  const [classeFiltro, setClasseFiltro] = useState("todas");
  const [printTarget, setPrintTarget] = useState<string | null>(null);

  useEffect(() => {
    if (error) toast.error(`Não foi possível carregar as listas: ${error.message}`);
  }, [error]);
  useEffect(() => {
    const reset = () => setPrintTarget(null);
    window.addEventListener("afterprint", reset);
    return () => window.removeEventListener("afterprint", reset);
  }, []);

  const grupos = useMemo(() => {
    const g = agruparPorClasse(linhas);
    return classeFiltro === "todas" ? g : g.filter((x) => x.classe === classeFiltro);
  }, [linhas, classeFiltro]);

  const imprimir = (target: string) => {
    setPrintTarget(target);
    window.setTimeout(() => window.print(), 50);
  };

  const pdf = (classe?: string, turma?: string) => {
    const sections = grupos
      .filter((g) => !classe || g.classe === classe)
      .flatMap((g) =>
        g.turmas
          .filter((t) => !turma || t.turma === turma)
          .map((t) => ({
            title: `Classe: ${g.classe} · Turma: ${t.turma}`,
            subtitle: `Ano Lectivo ${ANO_LETIVO_ATUAL} · Total: ${t.alunos.length} aluno(s)`,
            head: HEAD,
            body: t.alunos.map((a, i) => [i + 1, a.numero_processo || "—", a.nome_completo, a.idade ?? "—", a.data_nascimento ? a.data_nascimento.split("-").reverse().join("/") : "—", a.genero || "—", a.tipo]),
          })),
      );
    if (!sections.length) return toast.error("Não há alunos para exportar.");
    const nome = classe ? `lista-${classe}-${turma ?? "todas"}` : "listas-oficiais";
    downloadTablesPdf(nome.replace(/\s+/g, "-"), "LISTA OFICIAL DE ALUNOS", sections);
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .official-print-target, .official-print-target * { visibility: visible !important; }
          .official-print-target { position: absolute; inset: 0; width: 100%; padding: 24px; background: white; color: black; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-foreground">{titulo}</h2>
          <p className="text-sm text-muted-foreground">
            Matrículas e Confirmações — {ANO_LETIVO_ATUAL} · {linhas.length} aluno(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={classeFiltro} onValueChange={setClasseFiltro}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as classes</SelectItem>
              {agruparPorClasse([]).map((g) => <SelectItem key={g.classe} value={g.classe}>{g.classe}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => imprimir("all")}><Printer className="mr-2 h-4 w-4" />Imprimir</Button>
          <Button size="sm" variant="outline" onClick={() => pdf()}><FileDown className="mr-2 h-4 w-4" />Baixar PDF</Button>
          <Button size="sm" variant="ghost" onClick={() => void refresh()} disabled={refreshing || busy}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className={printTarget === "all" ? "official-print-target space-y-6" : "space-y-6"}>
        {grupos.map((g) => (
          <div key={g.classe} className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <span className="flex items-center gap-2 font-bold text-primary"><GraduationCap className="h-5 w-5" />{g.classe}</span>
              <span className="text-xs text-muted-foreground">{g.total} aluno(s)</span>
            </div>
            <div className="space-y-5 p-4">
              <AdicionarAluno classe={g.classe} onAdd={add} disabled={busy} />
              {g.turmas.length === 0 ? (
                <p className="py-2 text-center text-xs italic text-muted-foreground">
                  {loading ? "A carregar..." : "Nenhum aluno com matrícula ou confirmação nesta classe."}
                </p>
              ) : g.turmas.map((t) => {
                const target = `${g.classe}::${t.turma}`;
                return (
                  <div key={t.turma} className={printTarget === target ? "official-print-target space-y-2" : "space-y-2"}>
                    <div className="hidden print:block">
                      <h2 className="text-lg font-bold">Colégio Herdeiros do Futuro — Lista Oficial de Alunos</h2>
                      <p className="text-sm">Classe: {g.classe} · Turma: {t.turma} · Ano Lectivo: {ANO_LETIVO_ATUAL}</p>
                    </div>
                    <div className="flex items-center justify-between gap-2 rounded bg-muted/20 px-3 py-2 text-xs font-semibold">
                      <span>Turma: {t.turma} · {t.alunos.length} aluno(s)</span>
                      <span className="no-print flex gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => imprimir(target)}><Printer className="h-3.5 w-3.5" />Imprimir</Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => pdf(g.classe, t.turma)}><FileDown className="h-3.5 w-3.5" />PDF</Button>
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="print-grid w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            {HEAD.map((h) => <th key={h} className="p-2">{h}</th>)}
                            <th className="no-print p-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.alunos.map((a, i) => (
                            <LinhaEditavel key={a.key} linha={a} n={i + 1} onSave={(d) => update(a, d)} onDelete={() => remove(a)} disabled={busy || a.key.startsWith("pending-")} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

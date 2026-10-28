import { useEffect, useMemo, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { db as dbFrom } from "@/lib/db";
import { useTeacher } from "@/hooks/useTeacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Printer, TrendingDown, BarChart3, Download, FileText } from "lucide-react";
import { professorNav } from "@/lib/nav";
import { toast } from "sonner";
import { fetchMatriculas } from "@/lib/schoolData";

interface Aluno { id: string; nome: string; turma_id: string }
interface Nota { aluno_id: string; disciplina: string; media: number | null; trimestre: number }

export default function ProfessorReports() {
  const { assignments } = useTeacher();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros manuais para o relatório semanal / período
  const [semanaInicio, setSemanaInicio] = useState("");
  const [semanaFim, setSemanaFim] = useState("");
  const [observacoesRelatorio, setObservacoesRelatorio] = useState("");
  
  const ano = new Date().getFullYear();

  const turmas = useMemo(() => {
    const m = new Map<string, { id: string; nome: string; classe: string }>();
    assignments.forEach((a) => { if (!m.has(a.turma.id)) m.set(a.turma.id, a.turma); });
    return [...m.values()];
  }, [assignments]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        if (!turmas.length) {
          setAlunos([]);
          setNotas([]);
          return;
        }
        const turmaIds = new Set(turmas.map((turma) => turma.id));
        const list = (await fetchMatriculas())
          .filter((aluno) =>
            aluno.turma_id &&
            turmaIds.has(aluno.turma_id) &&
            (!aluno.ano_lectivo || aluno.ano_lectivo.replace(/[–—-]/g, "/").startsWith(String(ano))),
          )
          .map((aluno) => ({ id: aluno.id, nome: aluno.nome, turma_id: String(aluno.turma_id) }));
        const { data: ns, error } = list.length
          ? await dbFrom("mini_pautas")
            .select("aluno_id, disciplina, media_final, trimestre")
            .eq("ano_letivo", ano)
            .in("aluno_id", list.map((aluno) => Number(aluno.id)))
          : { data: [], error: null };
        if (error) throw error;
        if (!cancelled) {
          setAlunos(list);
          setNotas(((ns as any[]) ?? []).map((row) => ({
            aluno_id: String(row.aluno_id),
            disciplina: String(row.disciplina ?? ""),
            media: row.media_final == null ? null : Number(row.media_final),
            trimestre: Number(row.trimestre),
          })));
        }
      } catch (error: any) {
        console.error("[ProfessorReports] falha ao carregar dados do relatório:", error);
        if (!cancelled) {
          setAlunos([]);
          setNotas([]);
          toast.error(`Não foi possível carregar o relatório: ${error?.message ?? "verifique a ligação ao Supabase."}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [turmas, ano]);

  const recovery = useMemo(() => {
    const key = (a: string, d: string) => `${a}|${d}`;
    const acc: Record<string, number[]> = {};
    notas.forEach((n) => { if (n.media != null) (acc[key(n.aluno_id, n.disciplina)] ??= []).push(+n.media); });
    const items: { aluno: Aluno; disciplina: string; media: number }[] = [];
    Object.entries(acc).forEach(([k, arr]) => {
      const [aid, disc] = k.split("|");
      const m = arr.reduce((s,v)=>s+v,0)/arr.length;
      if (m >= 7 && m < 10) {
        const al = alunos.find((a) => a.id === aid);
        if (al) items.push({ aluno: al, disciplina: disc, media: m });
      }
    });
    return items.sort((a,b) => a.aluno.nome.localeCompare(b.aluno.nome));
  }, [notas, alunos]);

  const classAvgMatrix = useMemo(() => {
    const discs = [...new Set(notas.map((n) => n.disciplina))].sort();
    const rows = turmas.map((t) => {
      const tAlunoIds = new Set(alunos.filter((a) => a.turma_id === t.id).map((a) => a.id));
      const perDisc: Record<string, number | null> = {};
      discs.forEach((d) => {
        const vals = notas.filter((n) => n.disciplina === d && tAlunoIds.has(n.aluno_id) && n.media != null).map((n) => +n.media!);
        perDisc[d] = vals.length ? vals.reduce((s,v)=>s+v,0)/vals.length : null;
      });
      return { turma: t, perDisc };
    });
    return { discs, rows };
  }, [notas, alunos, turmas]);

  // Função para descarregar o Relatório Semanal e Balanço de Aproveitamento em PDF
  const descarregarRelatorioPDF = () => {
    const janelaPrint = window.open("", "_blank");
    if (!janelaPrint) {
      toast.error("Permita pop-ups no navegador para descarregar o PDF.");
      return;
    }

    const htmlConteudo = `
      <html>
        <head>
          <title>Relatório de Balanço e Aproveitamento - Herdeiros do Futuro</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.4; }
            h2 { text-align: center; margin-bottom: 2px; text-transform: uppercase; }
            p.sub { text-align: center; margin-top: 0; font-size: 14px; color: #666; margin-bottom: 20px; }
            .section { margin-bottom: 25px; }
            h3 { font-size: 16px; border-bottom: 2px solid #333; padding-bottom: 4px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { border: 1px solid #ccc; padding: 6px 10px; font-size: 12px; }
            th { background-color: #f4f4f4; text-align: left; }
            .center { text-align: center; }
            .obs-box { border: 1px solid #ccc; padding: 10px; border-radius: 4px; font-size: 13px; background: #fafafa; min-height: 50px; }
          </style>
        </head>
        <body>
          <h2>Colégio Herdeiros do Futuro</h2>
          <p class="sub">Relatório de Balanço de Aproveitamento e Atividades Semanais (${ano})</p>
          
          ${semanaInicio && semanaFim ? `
            <div class="section">
              <strong>Período do Relatório Semanal:</strong> De ${semanaInicio} até ${semanaFim}
            </div>
          ` : ""}

          <div class="section">
            <h3>1. Balanço de Médias por Turma e Disciplina</h3>
            ${classAvgMatrix.discs.length === 0 ? `<p>Sem notas registadas.</p>` : `
              <table>
                <thead>
                  <tr>
                    <th>Turma</th>
                    ${classAvgMatrix.discs.map(d => `<th class="center">${d}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${classAvgMatrix.rows.map(r => `
                    <tr>
                      <td><strong>${r.turma.nome}</strong> (${r.turma.classe})</td>
                      ${classAvgMatrix.discs.map(d => {
                        const v = r.perDisc[d];
                        return `<td class="center">${v == null ? "—" : v.toFixed(2)}</td>`;
                      }).join("")}
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `}
          </div>

          <div class="section">
            <h3>2. Alunos em Recuperação (Notas entre 7.00 e 9.99)</h3>
            ${recovery.length === 0 ? `<p>Nenhum aluno em recuperação neste momento.</p>` : `
              <table>
                <thead>
                  <tr>
                    <th>Nome do Aluno</th>
                    <th>Turma</th>
                    <th>Disciplina</th>
                    <th class="center">Média Atual</th>
                  </tr>
                </thead>
                <tbody>
                  ${recovery.map(r => {
                    const t = turmas.find(x => x.id === r.aluno.turma_id);
                    return `
                      <tr>
                        <td>${r.aluno.nome}</td>
                        <td>${t?.nome ?? "—"}</td>
                        <td>${r.disciplina}</td>
                        <td class="center"><strong>${r.media.toFixed(2)}</strong></td>
                      </tr>
                    `;
                  }).join("")}
                </tbody>
              </table>
            `}
          </div>

          <div class="section">
            <h3>3. Observações e Parecer Semanal do Professor</h3>
            <div class="obs-box">
              ${observacoesRelatorio ? observacoesRelatorio.replace(/\n/g, '<br>') : "Nenhuma observação registada para este período."}
            </div>
          </div>

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    janelaPrint.document.write(htmlConteudo);
    janelaPrint.document.close();
    toast.success("Relatório gerado e pronto para descarregar em PDF!");
  };

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Relatórios" navItems={professorNav}>
      <style>{`@media print { aside, header, .no-print, button { display: none !important; } main { padding: 0 !important; } }`}</style>
      <div className="space-y-6">
        
        {/* Cabeçalho e Ações */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-montserrat font-bold text-2xl lg:text-3xl">Relatórios e Balanço</h1>
            <p className="text-sm text-muted-foreground">Ano letivo {ano} — Acompanhamento pedagógico e de turmas.</p>
          </div>
          <div className="flex items-center gap-2 no-print">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
            <Button onClick={descarregarRelatorioPDF} className="gap-2">
              <Download className="h-4 w-4" /> Descarregar Relatório (PDF)
            </Button>
          </div>
        </div>

        {/* Bloco de Definição do Relatório Semanal */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" /> Parâmetros do Relatório Semanal
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Início da Semana / Período</Label>
              <Input type="date" value={semanaInicio} onChange={(e) => setSemanaInicio(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim da Semana / Período</Label>
              <Input type="date" value={semanaFim} onChange={(e) => setSemanaFim(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observações e Síntese Semanal</Label>
            <textarea
              rows={3}
              value={observacoesRelatorio}
              onChange={(e) => setObservacoesRelatorio(e.target.value)}
              placeholder="Escreva um breve resumo do comportamento das turmas, principais dificuldades abordadas ou sumário geral da semana..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        {/* Alunos em Recuperação */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-amber-600" /> Alunos em Recuperação (Aproveitamento Crítico)
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : recovery.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum aluno em recuperação identificado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary">
                    <th className="text-left px-3 py-2">Aluno</th>
                    <th className="text-left px-3 py-2">Turma</th>
                    <th className="text-left px-3 py-2">Disciplina</th>
                    <th className="text-center px-3 py-2">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {recovery.map((r, i) => {
                    const t = turmas.find((x) => x.id === r.aluno.turma_id);
                    return (
                      <tr key={i} className="border-b border-border/60 hover:bg-secondary/30">
                        <td className="px-3 py-2 font-medium">{r.aluno.nome}</td>
                        <td className="px-3 py-2">{t?.nome ?? "—"}</td>
                        <td className="px-3 py-2">{r.disciplina}</td>
                        <td className="px-3 py-2 text-center font-bold text-amber-600">{r.media.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Média por Turma x Disciplina (Balanço de Aproveitamento) */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm overflow-x-auto">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" /> Balanço: Média por Turma × Disciplina
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : classAvgMatrix.discs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem notas lançadas para calcular o balanço.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary">
                  <th className="text-left px-3 py-2">Turma</th>
                  {classAvgMatrix.discs.map((d) => (
                    <th key={d} className="text-center px-3 py-2">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classAvgMatrix.rows.map((r) => (
                  <tr key={r.turma.id} className="border-b border-border/60 hover:bg-secondary/30">
                    <td className="px-3 py-2 font-medium">{r.turma.nome} ({r.turma.classe})</td>
                    {classAvgMatrix.discs.map((d) => {
                      const v = r.perDisc[d];
                      const cls =
                        v == null
                          ? "text-muted-foreground"
                          : v >= 10
                          ? "text-green-600 font-bold"
                          : v >= 7
                          ? "text-amber-600 font-bold"
                          : "text-red-600 font-bold";
                      return (
                        <td key={d} className={`px-3 py-2 text-center ${cls}`}>
                          {v == null ? "—" : v.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </RoleLayout>
  );
}
import { useState, useEffect } from "react";
import RoleLayout from "@/components/RoleLayout";
import { professorNav } from "@/lib/nav";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { FileText, Download, Send, Edit, Trash2, CheckCircle2, Printer } from "lucide-react";
import { disciplinasDaClasse } from "@/lib/officialDocs";
import { downloadElementPdf } from "@/lib/elementPdf";
import { INSIGNIA } from "@/lib/insignia";
import { downloadExcel } from "@/lib/excelExport";
import { corNota } from "@/lib/corNota";

const ANO = new Date().getFullYear();

/** Converte a linha gravada (detalhes dentro de `notas`) no formato usado pelo ecrã. */
const desembrulhar = (b: any) => {
  const n = b?.notas ?? {};
  const temDetalhes = n && typeof n === "object" && "valores" in n;
  return {
    ...b,
    notas: temDetalhes ? n.valores ?? {} : n ?? {},
    periodo: temDetalhes ? n.periodo : b?.periodo,
    turma_nome: temDetalhes ? n.turma : b?.turma_nome,
    sala: temDetalhes ? n.sala : b?.sala,
    numero_aluno: temDetalhes ? n.numero : b?.numero_aluno,
    resultado: temDetalhes ? n.resultado : b?.resultado,
    media_geral: temDetalhes ? n.media_geral : b?.media_geral,
    ano_letivo: temDetalhes ? n.ano_letivo : b?.ano_letivo,
  };
};

const ProfessorBoletins = () => {
  const { user } = useAuth();
  
  // Seleção de Classe Dinâmica
  const [classe, setClasse] = useState("1ª Classe");
  const isPrimaria = ["1ª Classe", "2ª Classe", "3ª Classe", "4ª Classe", "5ª Classe", "6ª Classe"].includes(classe);
  const notaMaxima = isPrimaria ? 10 : 20;

  // Seleciona a lista de disciplinas correta dependendo do subsistema de ensino
  const disciplinasAtuais = disciplinasDaClasse(classe); // Inglês a partir da 2ª classe

  // Dados manuais do aluno e complementares
  const [nomeAluno, setNomeAluno] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [periodo, setPeriodo] = useState("1º Trimestre");
  const [extra, setExtra] = useState({ turma: "", sala: "", numero: "" });
  
  // Notas por disciplina
  const [valores, setValores] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);

  // Lista de boletins guardados/enviados do professor
  const [historicoBoletins, setHistoricoBoletins] = useState<any[]>([]);

  useEffect(() => {
    carregarHistorico();
  }, [user]);

  const carregarHistorico = async () => {
    try {
      if (!user) return;
      const { data, error } = await dbFrom("boletins").select("*").eq("professor_id", user.id);
      if (error) throw error;
      setHistoricoBoletins(((data ?? []) as any[]).map(desembrulhar).sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))));
    } catch (error: any) {
      setHistoricoBoletins([]);
      toast.error(`Não foi possível carregar os boletins do Supabase: ${error?.message ?? "erro desconhecido"}`);
    }
  };

  const arrayNotasFormatadas = disciplinasAtuais.map((d) => ({
    disciplina: d,
    valor: valores[d] === undefined || valores[d] === "" ? null : Number(valores[d]),
  }));

  const preenchidas = arrayNotasFormatadas.filter((n) => n.valor !== null);
  const media = preenchidas.length ? preenchidas.reduce((s, n) => s + (n.valor as number), 0) / preenchidas.length : null;
  
  const getResultado = (m: number | null) => {
    if (m === null) return "";
    if (isPrimaria) {
      return m >= 5 ? "Aprovado" : "Reprovado";
    } else {
      return m >= 10 ? "Aprovado" : "Reprovado";
    }
  };
  const resultado = getResultado(media);

  const atualizarNota = (d: string, val: string) => {
    if (val !== "") {
      const num = parseFloat(val);
      if (!isNaN(num) && (num < 0 || num > notaMaxima)) {
        toast.error(`A nota máxima para a ${classe} é ${notaMaxima} valores.`);
        return;
      }
    }
    setValores({ ...valores, [d]: val });
  };

  const nomeFicheiro = () => `boletim-${nomeAluno}-${classe}-${periodo}`.replace(/\s+/g, "-");
  const linhasNotas = () => disciplinasAtuais.map((d) => [d, valores[d] !== undefined && valores[d] !== "" ? valores[d] : "—"]);

  const baixarPDF = async () => {
    if (!nomeAluno.trim()) return toast.error("Por favor, introduza o nome completo do aluno.");
    try { await downloadElementPdf(".bol-doc", nomeFicheiro(), false, "a4"); }
    catch (e: any) { toast.error(`Não foi possível gerar o PDF: ${e?.message ?? "erro"}`); }
  };
  const imprimir = () => {
    if (!nomeAluno.trim()) return toast.error("Por favor, introduza o nome completo do aluno.");
    window.print();
  };

  const baixarExcel = () => {
    if (!nomeAluno.trim()) return toast.error("Por favor, introduza o nome completo do aluno.");
    downloadExcel(nomeFicheiro(), "Boletim", [
      ["Complexo Escolar Privado Herdeiros do Futuro — BOLETIM DE NOTAS"],
      ["Aluno", nomeAluno], ["Nº Processo", numeroProcesso || "—"], ["Classe", classe], ["Período", periodo],
      ["Turma", extra.turma || "—"], ["Sala", extra.sala || "—"], ["Nº", extra.numero || "—"],
      [],
      ["Disciplina", `Classificação (0-${notaMaxima})`],
      ...linhasNotas(),
      [],
      ["Média Geral", media !== null ? media.toFixed(2) : "—"], ["Resultado", resultado || "—"],
    ]);
  };

  const enviarOuAtualizar = async () => {
    if (!nomeAluno.trim()) {
      toast.error("Por favor, introduza o nome do aluno antes de enviar.");
      return;
    }

    setEnviando(true);
    // Só as colunas que existem na tabela `boletins`; o resto vai dentro de `notas`.
    const novoBoletim = {
      professor_id: user?.id ?? null,
      aluno_nome: nomeAluno.trim(),
      numero_processo: numeroProcesso.trim() || null,
      classe,
      notas: {
        valores,
        periodo,
        turma: extra.turma,
        sala: extra.sala,
        numero: extra.numero,
        ano_letivo: ANO,
        resultado,
        media_geral: media !== null ? Number(media.toFixed(2)) : null,
        professor_nome: user?.email ?? "Professor",
      },
    };

    try {
      if (editandoId) {
        const { error } = await dbFrom("boletins").update(novoBoletim).eq("id", editandoId);
        if (error) throw error;
        const atualizado = historicoBoletins.map((b) => (b.id === editandoId ? desembrulhar({ ...b, ...novoBoletim, id: editandoId }) : b));
        setHistoricoBoletins(atualizado);
        toast.success("Boletim atualizado com sucesso!");
        setEditandoId(null);
      } else {
        const { data, error } = await dbFrom("boletins").insert(novoBoletim).select().single();
        if (error) throw error;
        if (!data?.id) throw new Error("O Supabase não devolveu o ID do boletim gravado.");
        const atualizado = [desembrulhar(data), ...historicoBoletins];
        setHistoricoBoletins(atualizado);
        toast.success("Boletim enviado para o painel do Administrador com sucesso!");
      }

      setNomeAluno("");
      setNumeroProcesso("");
      setValores({});
      setExtra({ turma: "", sala: "", numero: "" });
    } catch (err: any) {
      toast.error("Erro ao processar: " + (err.message || "Erro desconhecido"));
    } finally {
      setEnviando(false);
    }
  };

  const carregarParaEdicao = (b: any) => {
    setEditandoId(b.id);
    setNomeAluno(b.aluno_nome || "");
    setNumeroProcesso(b.numero_processo || "");
    setClasse(b.classe || "1ª Classe");
    setPeriodo(b.periodo || "1º Trimestre");
    setExtra({
      turma: b.turma_nome || "",
      sala: b.sala || "",
      numero: b.numero_aluno || "",
    });
    setValores(b.notas || {});
    toast.info(`A carregar boletim de ${b.aluno_nome} para edição.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarBoletim = async (id: string) => {
    try {
      const { error } = await dbFrom("boletins").delete().eq("id", id);
      if (error) throw error;
      setHistoricoBoletins((current) => current.filter((b) => b.id !== id));
      toast.success("Boletim eliminado do Supabase.");
      if (editandoId === id) {
        setEditandoId(null);
        setNomeAluno("");
        setValores({});
      }
    } catch (error: any) {
      toast.error(`Não foi possível eliminar o boletim: ${error?.message ?? "erro desconhecido"}`);
    }
  };

  return (
    <RoleLayout title="Professor" subtitle="Herdeiros do Futuro" headerLabel="Boletins de Notas" navItems={professorNav}>
      <style>{`.bol-doc { display: none; } @media print { @page { size: A4 portrait; margin: 12mm; } body * { visibility: hidden !important; } .bol-doc, .bol-doc * { visibility: visible !important; } .bol-doc { display: block !important; position: absolute; left: 0; top: 0; width: 186mm; } } .bol-doc, .bol-doc * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } .bol-doc thead th { background: var(--primary) !important; color: var(--primary-foreground) !important; } .bol-doc tbody tr:nth-child(even) td { background: var(--secondary); } .bol-doc .titulo-cor { color: var(--primary); } .bol-doc .nota-baixa { color: var(--destructive) !important; font-weight: 700; }`}</style>
      <BoletimOficial
        nome={nomeAluno} processo={numeroProcesso} classe={classe} periodo={periodo} extra={extra}
        disciplinas={disciplinasAtuais} valores={valores} media={media} resultado={resultado} minimo={notaMaxima / 2} max={notaMaxima}
      />
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-montserrat font-bold text-2xl">Boletim de Notas (Por Classe)</h1>
              <p className="text-sm text-muted-foreground">Preencha os dados e as disciplinas oficiais de acordo com a classe seleccionada.</p>
            </div>
          </div>
          {editandoId && (
            <Button variant="destructive" size="sm" onClick={() => { setEditandoId(null); setNomeAluno(""); setValores({}); }}>
              Cancelar Edição
            </Button>
          )}
        </div>

        {/* Informações do Aluno e Dados Complementares */}
        <Card>
          <CardHeader><CardTitle className="text-base">Identificação do Aluno e Dados Complementares</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Classe (Define as Disciplinas)</Label>
                <Select value={classe} onValueChange={setClasse}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Ensino Primário (0 a 10 Valores)</div>
                    <SelectItem value="1ª Classe">1ª Classe</SelectItem>
                    <SelectItem value="2ª Classe">2ª Classe</SelectItem>
                    <SelectItem value="3ª Classe">3ª Classe</SelectItem>
                    <SelectItem value="4ª Classe">4ª Classe</SelectItem>
                    <SelectItem value="5ª Classe">5ª Classe</SelectItem>
                    <SelectItem value="6ª Classe">6ª Classe</SelectItem>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">Iº e IIº Ciclos (0 a 20 Valores)</div>
                    <SelectItem value="7ª Classe">7ª Classe</SelectItem>
                    <SelectItem value="8ª Classe">8ª Classe</SelectItem>
                    <SelectItem value="9ª Classe">9ª Classe</SelectItem>
                    <SelectItem value="10ª Classe">10ª Classe</SelectItem>
                    <SelectItem value="11ª Classe">11ª Classe</SelectItem>
                    <SelectItem value="12ª Classe">12ª Classe</SelectItem>
                    <SelectItem value="13ª Classe">13ª Classe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome Completo do Aluno</Label>
                <Input 
                  value={nomeAluno} 
                  onChange={(e) => setNomeAluno(e.target.value)} 
                  placeholder="Ex: Ana Paula da Silva" 
                />
              </div>

              <div className="space-y-2">
                <Label>Número de Processo</Label>
                <Input 
                  value={numeroProcesso} 
                  onChange={(e) => setNumeroProcesso(e.target.value)} 
                  placeholder="Ex: 2026102" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["1º Trimestre", "2º Trimestre", "3º Trimestre", "Anual"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Turma</Label><Input value={extra.turma} onChange={(e) => setExtra({ ...extra, turma: e.target.value })} placeholder="Ex: A" /></div>
              <div className="space-y-2"><Label>Sala</Label><Input value={extra.sala} onChange={(e) => setExtra({ ...extra, sala: e.target.value })} placeholder="Ex: 12" /></div>
              <div className="space-y-2"><Label>Nº Aluno</Label><Input value={extra.numero} onChange={(e) => setExtra({ ...extra, numero: e.target.value })} placeholder="Ex: 05" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Classificações por Disciplina (Dinâmicas com base no Primário ou Ciclo) */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">
                Classificações — {isPrimaria ? "Ensino Primário" : "Iº/IIº Ciclo"} ({classe})
              </CardTitle>
              <span className="text-xs bg-secondary px-2.5 py-1 rounded-md font-medium text-muted-foreground">
                Escala: 0 a {notaMaxima} valores
              </span>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {disciplinasAtuais.map((d) => (
              <div key={d} className="flex items-center gap-2">
                <span className="text-sm flex-1 font-medium">{d}</span>
                <Input 
                  type="number" min={0} max={notaMaxima} step={0.1}
                  className="w-24 text-center font-mono"
                  placeholder="0.0"
                  value={valores[d] ?? ""} 
                  onChange={(e) => atualizarNota(d, e.target.value)} 
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Rodapé com Médias e Ações */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
          <div className="text-sm">
            Média Geral: <strong className="font-mono text-base">{media === null ? "—" : media.toFixed(2)}</strong> &nbsp;|&nbsp; 
            Resultado: <strong className={resultado === "Aprovado" ? "text-green-600" : resultado === "Reprovado" ? "text-red-600" : ""}>{resultado || "—"}</strong>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={imprimir} className="gap-2">
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button variant="outline" onClick={() => void baixarPDF()} className="gap-2">
              <Download className="h-4 w-4" /> Baixar PDF
            </Button>
            <Button variant="outline" onClick={baixarExcel} className="gap-2">
              <Download className="h-4 w-4" /> Baixar Excel
            </Button>
            <Button onClick={enviarOuAtualizar} disabled={enviando} className="gap-2">
              {editandoId ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {enviando ? "A guardar..." : editandoId ? "Guardar alterações" : "Guardar no histórico"}
            </Button>
          </div>
        </div>

        {/* Histórico / Lista de Boletins Criados pelo Professor */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm mt-8">
          <h3 className="font-montserrat font-bold text-lg">Boletins Registados e Enviados</h3>
          <p className="text-xs text-muted-foreground">Clique no lápis para editar um boletim; depois carregue em «Guardar alterações».</p>

          {historicoBoletins.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Ainda não guardou nenhum boletim.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/40 text-muted-foreground">
                    <th className="text-left p-3">Aluno</th>
                    <th className="text-center p-3">Classe</th>
                    <th className="text-center p-3">Turma</th>
                    <th className="text-center p-3">Período</th>
                    <th className="text-center p-3">Média</th>
                    <th className="text-center p-3">Estado</th>
                    <th className="text-center p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoBoletins.map((b) => (
                    <tr key={b.id} className="border-b border-border/60 hover:bg-secondary/20">
                      <td className="p-3 font-medium">{b.aluno_nome}</td>
                      <td className="p-3 text-center">{b.classe}</td>
                      <td className="p-3 text-center">{b.turma_nome || "—"}</td>
                      <td className="p-3 text-center">{b.periodo}</td>
                      <td className="p-3 text-center font-mono font-bold">{b.media_geral || "—"}</td>
                      <td className="p-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${b.resultado === 'Aprovado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {b.resultado || "Pendente"}
                        </span>
                      </td>
                      <td className="p-3 text-center flex justify-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => carregarParaEdicao(b)} title="Editar Boletim">
                          <Edit className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => eliminarBoletim(b.id)} title="Eliminar Boletim">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RoleLayout>
  );
};

function BoletimOficial({ nome, processo, classe, periodo, extra, disciplinas, valores, media, resultado, minimo, max }: {
  nome: string; processo: string; classe: string; periodo: string; extra: { turma: string; sala: string; numero: string };
  disciplinas: string[]; valores: Record<string, string>; media: number | null; resultado: string; minimo: number; max: number;
}) {
  const cel = "border border-foreground px-2 py-1";
  return (
    <div className="bol-doc bg-background text-[12px] leading-snug text-foreground">
      <div className="text-center font-bold uppercase">
        <img src={INSIGNIA} alt="Insígnia da República de Angola" className="insignia mx-auto mb-1 h-16" />
        <p>República de Angola</p>
        <p>Governo Provincial de Luanda</p>
        <p>Administração Municipal do Kilamba Kiaxi</p>
        <p>Direcção Municipal da Educação</p>
        <p className="titulo-cor mt-1">Complexo Escolar Privado Herdeiros do Futuro</p>
        <p className="titulo-cor mt-3 text-base">Boletim de Notas — {periodo}</p>
        <p className="text-[11px] font-semibold">Ano Lectivo {ANO}/{ANO + 1}</p>
      </div>
      <table className="mt-4 w-full border-collapse">
        <tbody>
          <tr><td className={`${cel} font-bold`}>Nome do Aluno</td><td className={cel} colSpan={3}>{nome}</td></tr>
          <tr><td className={`${cel} font-bold`}>Nº Processo</td><td className={cel}>{processo || "—"}</td><td className={`${cel} font-bold`}>Classe</td><td className={cel}>{classe}</td></tr>
          <tr><td className={`${cel} font-bold`}>Turma / Sala</td><td className={cel}>{extra.turma || "—"} / {extra.sala || "—"}</td><td className={`${cel} font-bold`}>Nº do Aluno</td><td className={cel}>{extra.numero || "—"}</td></tr>
        </tbody>
      </table>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr><th className={`${cel} w-10`}>Nº</th><th className={`${cel} text-left`}>Disciplina</th><th className={`${cel} w-40`}>Classificação (0-{max})</th></tr>
        </thead>
        <tbody>
          {disciplinas.map((d, i) => {
            const v = valores[d];
            return (
              <tr key={d}>
                <td className={`${cel} text-center`}>{i + 1}</td>
                <td className={cel}>{d}</td>
                <td className={`${cel} text-center font-semibold ${corNota(v, minimo, max)}`}>{v !== undefined && v !== "" ? v : "—"}</td>
              </tr>
            );
          })}
          <tr><td className={cel} /><td className={`${cel} font-bold`}>Média Geral</td><td className={`${cel} text-center media-final ${corNota(media, minimo, max)}`}>{media !== null ? media.toFixed(2) : "—"}</td></tr>
          <tr><td className={cel} /><td className={`${cel} font-bold`}>Resultado</td><td className={`${cel} text-center font-bold ${resultado === "Reprovado" ? "nota-baixa" : ""}`}>{resultado || "—"}</td></tr>
        </tbody>
      </table>
      <p className="mt-6 text-center">Luanda, ____ de ________________ de ________</p>
      <div className="mt-10 grid grid-cols-3 gap-6 text-center">
        {["O(A) Professor(a)", "O(A) Director(a)", "O(A) Encarregado(a)"].map((a) => (
          <div key={a}><p>______________________________</p><p className="mt-1 font-semibold">{a}</p></div>
        ))}
      </div>
    </div>
  );
}

export default ProfessorBoletins;
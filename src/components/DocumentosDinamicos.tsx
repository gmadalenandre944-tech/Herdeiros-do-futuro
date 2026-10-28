import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileType2, Loader2, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { fetchAlunosResult, type AlunoRow } from "@/lib/alunosApi";
import { fetchMediasPorDisciplina } from "@/lib/schoolData";
import { baixarWord, cabecalhoHtml, assinaturaHtml } from "@/lib/wordDocs";
import { CERT_CICLO1, CERT_PRIMARIO, disciplinasDaClasse, ehPrimaria, temIngles, gerarCertificadoPDF, gerarDeclaracaoNotasPDF, notaDe, type AlunoDoc, type NotasCiclos } from "@/lib/officialDocs";

const v = (x: unknown) => (x === null || x === undefined || x === "" ? "—" : String(x));
const linha = (k: string, val: unknown) =>
  `<tr><td style="border:1px solid #999;padding:6px;width:35%;background:#f2f2f2"><b>${k}</b></td><td style="border:1px solid #999;padding:6px">${v(val)}</td></tr>`;
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-");

export default function DocumentosDinamicos({ escola }: { escola: string }) {
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [classe, setClasse] = useState("");
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    fetchAlunosResult().then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar os alunos: " + error.message);
      setAlunos(data);
      setLoading(false);
    });
  }, []);

  const filtrados = useMemo(
    () => alunos.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 200),
    [alunos, busca],
  );
  const classes = useMemo(() => [...new Set(alunos.map((a) => a.classe).filter(Boolean))].sort() as string[], [alunos]);
  const aluno = alunos.find((a) => a.id === alunoId);
  const ano = new Date().getFullYear();

  const exigirAluno = () => {
    if (!aluno) toast.error("Escolha primeiro um aluno.");
    return aluno;
  };

  const fichaMatricula = () => {
    const a = exigirAluno(); if (!a) return;
    const corpo = cabecalhoHtml(escola, "FICHA DE MATRÍCULA") +
      `<table style="width:100%;border-collapse:collapse;font-size:11pt;margin-top:20px">
        ${linha("Nome completo", a.nome)}
        ${linha("Nº de processo", a.numero_processo)}
        ${linha("Data de nascimento", a.data_nascimento)}
        ${linha("Sexo", a.sexo ?? a.genero)}
        ${linha("Classe", a.classe)}
        ${linha("Turma", a.turma ?? a.turma_nome)}
        ${linha("Nome do pai", a.nome_pai)}
        ${linha("Nome da mãe", a.nome_mae)}
        ${linha("Encarregado de educação", a.encarregado)}
        ${linha("Contacto", a.contacto)}
        ${linha("Morada", a.morada ?? a.endereco)}
        ${linha("Ano lectivo", a.ano_letivo ?? `${ano}/${ano + 1}`)}
      </table>` + assinaturaHtml();
    baixarWord(`ficha-matricula-${slug(a.nome)}`, "Ficha de Matrícula", corpo);
    toast.success("Ficha de matrícula gerada.");
  };

  const alunoDoc = (a: AlunoRow): AlunoDoc => ({
    nome: a.nome,
    classe: a.classe,
    turma: a.turma ?? a.turma_nome ?? null,
    sala: a.sala ?? null,
    numero: a.numero ?? a.numero_aluno ?? null,
    numero_processo: a.numero_processo,
    data_nascimento: a.data_nascimento,
    naturalidade: a.naturalidade ?? a.municipio ?? null,
    bi: a.bi ?? a.numero_bi ?? a.bilhete ?? null,
    pai: a.nome_pai ?? null,
    mae: a.nome_mae ?? null,
    ano_lectivo: a.ano_letivo ?? `${ano - 1}/${ano}`,
  });

  /** Certificado no modelo oficial (Primário ou I Ciclo), com as médias do sistema. */
  const certificado = async () => {
    const a = exigirAluno(); if (!a) return;
    setGerando(true);
    try {
      const medias = await fetchMediasPorDisciplina(a.id).catch(() => []);
      const n = Number(String(a.classe ?? "").match(/\d+/)?.[0] ?? 0);
      const prim = n <= 6;
      const col = prim ? (n === 2 ? 0 : n === 4 ? 1 : 2) : n === 7 ? 0 : n === 8 ? 1 : 2;
      const notas: NotasCiclos = {};
      (prim ? CERT_PRIMARIO : CERT_CICLO1).forEach(({ d }) => {
        const v = notaDe(medias, d);
        const arr: (number | null)[] = [null, null, null];
        arr[col] = v;
        notas[d] = arr;
      });
      gerarCertificadoPDF(alunoDoc(a), prim ? "primario" : "ciclo1", notas).save(`certificado-${slug(a.nome)}.pdf`);
      toast.success(medias.length ? "Certificado gerado." : "Certificado gerado sem notas (ainda não há notas lançadas para este aluno).");
    } finally { setGerando(false); }
  };

  /** Declaração no modelo oficial, com as médias do sistema. */
  const declaracao = async () => {
    const a = exigirAluno(); if (!a) return;
    setGerando(true);
    try {
      const medias = await fetchMediasPorDisciplina(a.id).catch(() => []);
      const nc = Number(String(a.classe ?? "").match(/\d+/)?.[0] ?? 0);
      const discs = !ehPrimaria(a.classe ?? "") ? disciplinasDaClasse(a.classe ?? "")
        : [...(nc >= 5
          ? ["Língua Portuguesa", "Matemática", "Ciências da Natureza", "História", "Geografia", "Educação Moral e Cívica", "Educação Manual e Plástica", "Educação Musical", "Educação Física"]
          : ["Língua Portuguesa", "Matemática", "Estudo do Meio", "Educação Manual e Plástica", "Educação Musical", "Educação Física"]),
          ...(temIngles(a.classe ?? "") ? ["Língua Inglesa"] : [])];
      const linhas = discs.map((d) => ({ disciplina: d, valor: notaDe(medias, d) }));
      const extra = medias.filter((m) => !discs.some((d) => notaDe([m], d) !== null)).map((m) => ({ disciplina: m.disciplina, valor: m.media }));
      const todas = [...linhas, ...extra];
      const ok = todas.map((x) => x.valor).filter((v): v is number => v !== null);
      const max = ehPrimaria(a.classe ?? "") ? 10 : 20;
      const media = ok.length ? ok.reduce((s, v) => s + v, 0) / ok.length : null;
      const resultado = media === null ? "Transitado" : media >= max / 2 ? "Transitado" : "Não Transitado";
      gerarDeclaracaoNotasPDF(alunoDoc(a), todas, { resultado }).save(`declaracao-${slug(a.nome)}.pdf`);
      toast.success("Declaração gerada.");
    } finally { setGerando(false); }
  };

  const pauta = async () => {
    if (!classe) return toast.error("Escolha a classe para a pauta.");
    setGerando(true);
    try {
      const lista = alunos.filter((a) => a.classe === classe);
      const linhas = await Promise.all(lista.map(async (a) => {
        const m = await fetchMediasPorDisciplina(a.id).catch(() => []);
        return { a, m };
      }));
      const disciplinas = [...new Set(linhas.flatMap((l) => l.m.map((x) => x.disciplina)))].sort();
      const th = (t: string) => `<th style="border:1px solid #999;padding:4px;background:#f2f2f2;font-size:9pt">${t}</th>`;
      const td = (t: string) => `<td style="border:1px solid #999;padding:4px;font-size:9pt;text-align:center">${t}</td>`;
      const corpo = cabecalhoHtml(escola, `PAUTA — ${classe} — ${ano}/${ano + 1}`) +
        `<table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr>${th("Nº")}${th("Nome")}${disciplinas.map(th).join("")}${th("Média")}${th("Resultado")}</tr>
          ${linhas.map(({ a, m }, i) => {
            const notas = disciplinas.map((d) => m.find((x) => x.disciplina === d)?.media);
            const validas = notas.filter((n): n is number => typeof n === "number");
            const med = validas.length ? validas.reduce((s, n) => s + n, 0) / validas.length : null;
            return `<tr>${td(String(i + 1))}<td style="border:1px solid #999;padding:4px;font-size:9pt">${a.nome}</td>${notas.map((n) => td(n === undefined ? "—" : n.toFixed(1))).join("")}${td(med === null ? "—" : med.toFixed(1))}${td(med === null ? "—" : med >= 10 ? "Aprovado" : "Reprovado")}</tr>`;
          }).join("")}
        </table>` + assinaturaHtml();
      baixarWord(`pauta-${slug(classe)}`, `Pauta ${classe}`, corpo);
      toast.success(`Pauta da ${classe} gerada (${lista.length} alunos).`);
    } finally { setGerando(false); }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserSearch className="h-5 w-5 text-primary" />Documentos preenchidos automaticamente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />A carregar alunos...</p> : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Input placeholder="Pesquisar aluno pelo nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
              <select value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                <option value="">— Escolher aluno ({filtrados.length}) —</option>
                {filtrados.map((a) => <option key={a.id} value={a.id}>{a.nome}{a.classe ? ` · ${a.classe}` : ""}</option>)}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Button onClick={fichaMatricula} className="gap-2"><FileType2 className="h-4 w-4" />Ficha de Matrícula</Button>
              <Button onClick={certificado} disabled={gerando} className="gap-2"><FileType2 className="h-4 w-4" />Certificado (PDF)</Button>
              <Button onClick={declaracao} disabled={gerando} className="gap-2"><FileType2 className="h-4 w-4" />Declaração (PDF)</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 border-t border-border pt-4">
              <select value={classe} onChange={(e) => setClasse(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                <option value="">— Escolher classe —</option>
                {classes.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <Button onClick={pauta} disabled={gerando} variant="secondary" className="gap-2">
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileType2 className="h-4 w-4" />}Gerar Pauta da Classe
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INSIGNIA, INSIGNIA_RATIO } from "./insignia";

/**
 * Modelos oficiais de documentos do
 * COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO
 * República de Angola — Província de Luanda — D.M.E. do Kilamba Kiaxi
 */

export const DISCIPLINAS_BOLETIM = [
  "Língua Portuguesa",
  "Matemática",
  "Biologia",
  "Geografia",
  "História",
  "Química",
  "Física",
  "Inglês",
  "E.V.P",
  "Educação Moral e Cívica",
  "Educação Laboral",
  "Educação Física",
];

export const DISCIPLINAS_PRIMARIO = [
  "Língua Portuguesa",
  "Matemática",
  "Estudo do Meio",
  "Ciências da Natureza",
  "História",
  "Geografia",
  "Educação Moral e Cívica",
  "Educação Manual e Plástica",
  "Educação Musical",
  "Educação Física",
  "Línguas de Origem Africana",
];

const EXTENSO: Record<number, string> = {
  0: "Zero", 1: "Um", 2: "Dois", 3: "Três", 4: "Quatro", 5: "Cinco", 6: "Seis",
  7: "Sete", 8: "Oito", 9: "Nove", 10: "Dez", 11: "Onze", 12: "Doze", 13: "Treze",
  14: "Catorze", 15: "Quinze", 16: "Dezasseis", 17: "Dezassete", 18: "Dezoito",
  19: "Dezanove", 20: "Vinte",
};

export const porExtenso = (n: number | null | undefined) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const r = Math.round(Number(n));
  return `${EXTENSO[r] ?? r} valores`;
};

export const hojeExtenso = () => {
  const d = new Date();
  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return `Luanda, aos ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
};

/** Cabeçalho oficial centrado. Devolve o Y seguinte. */
export function cabecalhoOficial(
  doc: jsPDF,
  linhas: string[] = [
    "REPÚBLICA DE ANGOLA",
    "PROVÍNCIA DE LUANDA",
    "DIRECÇÃO MUNICIPAL DA EDUCAÇÃO DO K. KIAXI",
    "COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO",
  ],
  startY = 18,
) {
  const w = doc.internal.pageSize.getWidth();
  try { doc.addImage(INSIGNIA, "JPEG", w / 2 - 7, startY - 15, 14, 14); } catch { /* ignore */ }

  let y = startY + 4;
  doc.setFont("helvetica", "bold");
  linhas.forEach((l, i) => {
    doc.setFontSize(i === linhas.length - 1 ? 11 : 12);
    doc.text(l, w / 2, y, { align: "center" });
    y += 6;
  });
  doc.setFont("helvetica", "normal");
  return y + 2;
}

function moldura(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setLineWidth(0.8);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setLineWidth(0.3);
  doc.rect(11, 11, w - 22, h - 22);
  doc.setLineWidth(0.2);
}

function assinaturas(doc: jsPDF, y: number, esquerda: string, direita: string) {
  doc.setFontSize(10);
  doc.text("_____________________________", 22, y);
  doc.text("_____________________________", 118, y);
  doc.text(esquerda, 22, y + 6);
  doc.text(direita, 118, y + 6);
}

export interface AlunoDoc {
  nome: string;
  classe?: string | null;
  turma?: string | null;
  sala?: string | null;
  numero?: string | null;
  numero_processo?: string | null;
  data_nascimento?: string | null;
  naturalidade?: string | null;
  bi?: string | null;
  pai?: string | null;
  mae?: string | null;
  foto?: string | null;
  tel_escola?: string | null;
  tel_encarregado?: string | null;
  ano_lectivo?: string | null;
}

export type NotaLinha = { disciplina: string; valor: number | null };

/* ------------------------------ BOLETIM DE NOTAS ------------------------------ */
export function gerarBoletimPDF(aluno: AlunoDoc, notas: NotaLinha[], periodo = "", resultado = "") {
  const doc = new jsPDF();
  moldura(doc);
  let y = cabecalhoOficial(doc);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("BOLETIM DE NOTAS", doc.internal.pageSize.getWidth() / 2, y + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);

  y += 18;
  doc.text(`Nome: ${aluno.nome}`, 20, y); y += 7;
  doc.text(`Classe: ${aluno.classe ?? "____"}    Nº: ${aluno.numero ?? aluno.numero_processo ?? "____"}    Sala: ${aluno.sala ?? "____"}    Turma: ${aluno.turma ?? "____"}`, 20, y); y += 7;
  doc.text(`Período: ${periodo || "____________"}     Ano Lectivo: ${aluno.ano_lectivo ?? "________"}`, 20, y); y += 7;
  doc.text(`Resultado Final: ${resultado || "____________________"}`, 20, y);

  const linhas = DISCIPLINAS_BOLETIM.map((d) => {
    const n = notas.find((x) => x.disciplina.toLowerCase() === d.toLowerCase());
    const v = n?.valor ?? null;
    return [d, v === null ? "(     ) ______________" : `( ${Math.round(v)} )  ${porExtenso(v)}`];
  });

  autoTable(doc, {
    startY: y + 8,
    head: [["DISCIPLINAS", "VALORES"]],
    body: linhas,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 2.4, textColor: 20, lineColor: [60, 40, 60] },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 80 } },
    margin: { left: 20, right: 20 },
  });

  const endY = (doc as any).lastAutoTable.finalY + 14;
  doc.setFontSize(11);
  doc.text(hojeExtenso(), 20, endY);
  assinaturas(doc, endY + 26, "Assinatura do Encarregado", "O(a) Professor(a)");
  return doc;
}

/* ----------------------- Texto justificado com estilos ----------------------- */
type Seg = { t: string; b?: boolean; red?: boolean };
/** Escreve parágrafo justificado com partes a negrito/vermelho. Devolve o Y final. */
function paragrafo(doc: jsPDF, segs: Seg[], x: number, y: number, maxW: number, lh = 6.2, font = "times") {
  const words: { w: string; b?: boolean; red?: boolean }[] = [];
  segs.forEach((s) => s.t.split(/\s+/).filter(Boolean).forEach((w) => words.push({ w, b: s.b, red: s.red })));
  const width = (w: (typeof words)[number]) => { doc.setFont(font, w.b ? "bold" : "normal"); return doc.getTextWidth(w.w); };
  const space = () => { doc.setFont(font, "normal"); return doc.getTextWidth(" "); };
  let line: typeof words = [];
  let lineW = 0;
  const flush = (last: boolean) => {
    const total = line.reduce((s, w) => s + width(w), 0);
    const gap = !last && line.length > 1 ? (maxW - total) / (line.length - 1) : space();
    let cx = x;
    line.forEach((w) => {
      doc.setFont(font, w.b ? "bold" : "normal");
      if (w.red) doc.setTextColor(220, 20, 20); else doc.setTextColor(0);
      doc.text(w.w, cx, y);
      cx += doc.getTextWidth(w.w) + gap;
    });
    doc.setTextColor(0);
    y += lh;
    line = []; lineW = 0;
  };
  words.forEach((w) => {
    const ww = width(w);
    if (line.length && lineW + space() + ww > maxW) flush(false);
    lineW += (line.length ? space() : 0) + ww;
    line.push(w);
  });
  if (line.length) flush(true);
  doc.setFont(font, "normal");
  return y;
}

function insignia(doc: jsPDF, y: number, h = 16) {
  const w = doc.internal.pageSize.getWidth();
  const iw = h * INSIGNIA_RATIO;
  try { doc.addImage(INSIGNIA, "JPEG", w / 2 - iw / 2, y, iw, h); } catch { /* ignore */ }
  return y + h;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
const ALIAS: Record<string, string[]> = {
  "lingua inglesa": ["ingles", "lingua inglesa"],
  "educacao visual e plastica": ["e v p", "evp", "educacao visual e plastica"],
  "educacao manual e plastica": ["educacao manual e plastica", "e m plastica"],
  "historia": ["historia"],
};
/** Procura a nota de uma disciplina numa lista {disciplina, media} tolerando nomes diferentes. */
export function notaDe(lista: { disciplina: string; media: number }[], disciplina: string): number | null {
  const k = norm(disciplina);
  const chaves = ALIAS[k] ?? [k];
  const r = lista.find((m) => chaves.includes(norm(m.disciplina)) || norm(m.disciplina) === k);
  return r ? r.media : null;
}

const pad2 = (n: number) => String(Math.round(n)).padStart(2, "0");
const ORDINAL: Record<string, string> = {
  "1": "Primeira", "2": "Segunda", "3": "Terceira", "4": "Quarta", "5": "Quinta", "6": "Sexta",
  "7": "Sétima", "8": "Oitava", "9": "Nona", "10": "Décima", "11": "Décima Primeira", "12": "Décima Segunda", "13": "Décima Terceira",
};
const numClasse = (c?: string | null) => (c ?? "").match(/\d+/)?.[0] ?? "";

/* --------------------------- DECLARAÇÃO DE NOTAS --------------------------- */
export function gerarDeclaracaoNotasPDF(
  aluno: AlunoDoc,
  notas: NotaLinha[],
  opts: { director?: string; anoLectivo?: string; resultado?: string } = {},
) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = insignia(doc, 10, 15) + 5;
  doc.setFont("times", "normal");
  doc.setFontSize(12.5);
  ["REPÚBLICA DE ANGOLA", "GOVERNO PROVINCIAL DE LUANDA", "ADMINISTRAÇÃO MUNICÍPAL DO KILAMBA KIAXI", "DIRECÇÃO MUNICÍPAL DA EDUCAÇÃO", "COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO"]
    .forEach((l) => { doc.text(l, w / 2, y, { align: "center" }); y += 5.6; });

  y += 10;
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.text("DECLARAÇÃO", w / 2, y, { align: "center" });
  y += 12;
  doc.setFontSize(12.5);

  const director = opts.director ?? "Simite Manuel Feleciano Quingungo";
  const n = numClasse(aluno.classe);
  y = paragrafo(doc, [
    { t: `${director}, Director do Complexo Escolar Privado Herdeiros do Futuro do Município do Kilamba Kiaxi.`, b: true },
    { t: "Declara que" },
    { t: `${aluno.nome},`, b: true, red: true },
    { t: `filho(a) de ${aluno.pai || "____________________"} e de ${aluno.mae || "____________________"}, nascido(a) aos ${aluno.data_nascimento || "____/____/______"}, natural de ${aluno.naturalidade || "____________"}, Província de Luanda, Frequentou o lectivo ${opts.anoLectivo ?? aluno.ano_lectivo ?? "____/____"}, ${n ? `${n}ª` : "____"} Classe (` },
    { t: `${ORDINAL[n] ?? "______"} Classe`, red: true },
    { t: `) na turma ${aluno.turma || "__"}, sala ${aluno.sala || "__"}, Sob nº ${aluno.numero || aluno.numero_processo || "__"}, tendo` },
    { t: opts.resultado ?? "Transitado", b: true },
    { t: "com as seguintes classificações:" },
  ], 20, y, w - 40);

  autoTable(doc, {
    startY: y,
    head: [["DISCIPLINAS", "VALORES"]],
    body: notas.map((x) => [x.disciplina, x.valor === null ? "" : `(${pad2(x.valor)}) ${porExtenso(x.valor)}`]),
    theme: "grid",
    styles: { font: "times", fontSize: 12, cellPadding: 1.4, textColor: 0, lineColor: 0, lineWidth: 0.2 },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", halign: "center" },
    columnStyles: { 0: { cellWidth: 102 }, 1: { halign: "center", fontStyle: "bold" } },
    margin: { left: 24, right: 24 },
  });

  let endY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(12.5);
  endY = paragrafo(doc, [
    { t: "Por ser verdade e me ter sido solicitado para" },
    { t: "efeito de registo,", b: true },
    { t: "e assim constar nos devidos efeitos, passa-se a presente DECLARAÇÃO que vai assinada por mim e autenticada com o carimbo a óleo em uso neste estabelecimento de ensino." },
  ], 20, endY, w - 40);
  doc.setFont("times", "normal");
  doc.text(hojeExtenso() + ".", 20, endY + 6);
  doc.text("O DIRECTOR", w / 2, endY + 22, { align: "center" });
  doc.text("_______________________________", w / 2, endY + 36, { align: "center" });
  doc.text(director, w / 2, endY + 43, { align: "center" });
  return doc;
}

/* ------------------------------- CERTIFICADOS ------------------------------- */
/** Disciplinas do certificado e em que colunas (ciclos) não existem (célula preta). */
export const CERT_PRIMARIO: { d: string; sem: number[] }[] = [
  { d: "Língua Portuguesa", sem: [] }, { d: "Matemática", sem: [] }, { d: "Estudo do Meio", sem: [2] },
  { d: "Ciências da Natureza", sem: [0, 1] }, { d: "História", sem: [0, 1] }, { d: "Geografia", sem: [0, 1] },
  { d: "Educação Moral e Cívica", sem: [0, 1] }, { d: "Educação Manual e Plástica", sem: [] },
  { d: "Educação Musical", sem: [] }, { d: "Educação Física", sem: [] }, { d: "Línguas de Origem Africana", sem: [0, 1, 2, 3, 4] },
];
export const CERT_CICLO1: { d: string; sem: number[] }[] = [
  "Língua Portuguesa", "Língua Inglesa", "Matemática", "Biologia", "Física", "Química", "Geografia", "História",
  "Educação Física", "Educação Moral e Cívica", "Educação Visual e Plástica", "Educação Laboral",
].map((d) => ({ d, sem: [] as number[] }));

export type NotasCiclos = Record<string, (number | null)[]>; // disciplina -> [col1, col2, col3]

export function gerarCertificadoPDF(
  aluno: AlunoDoc,
  nivel: "primario" | "ciclo1",
  notas: NotasCiclos,
  opts: { director?: string; escola?: string; decreto?: string; anoLectivo?: string; livro?: string } = {},
) {
  const prim = nivel === "primario";
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  doc.setLineWidth(0.6); doc.rect(8, 8, w - 16, doc.internal.pageSize.getHeight() - 16); doc.setLineWidth(0.2);
  let y = insignia(doc, 12, 16) + 5;
  doc.setFont("times", "bold"); doc.setFontSize(12);
  doc.text("República de Angola", w / 2, y, { align: "center" }); y += 5.5;
  doc.text("Ministério da Educação", w / 2, y, { align: "center" }); y += 10;
  doc.setFontSize(13);
  doc.text(prim ? "ENSINO PRIMÁRIO" : "I CICLO DO ENSINO SECUNDÁRIO", w / 2, y, { align: "center" }); y += 14;
  doc.setFontSize(32);
  doc.text("CERTIFICADO", w / 2, y, { align: "center" }); y += 9;
  doc.setFontSize(12);

  const linhas = (prim ? CERT_PRIMARIO : CERT_CICLO1).map(({ d, sem }) => {
    const vals = [0, 1, 2].map((i) => (sem.includes(i) ? null : notas[d]?.[i] ?? null));
    const ok = vals.filter((v): v is number => v !== null);
    const mf = ok.length && !sem.includes(3) ? Math.round(ok.reduce((s, v) => s + v, 0) / ok.length) : null;
    return { d, sem, vals, mf };
  });
  const mfs = linhas.map((l) => l.mf).filter((v): v is number => v !== null);
  const mediaFinal = mfs.length ? Math.round(mfs.reduce((s, v) => s + v, 0) / mfs.length) : null;

  const director = opts.director ?? (prim ? "Nelson da Costa António" : "Ermênio Pedro Quiala Lusambo");
  const escola = opts.escola ?? (prim ? "Director do Complexo Escolar nº 6036 LDA- Kilamba Kiaxi" : "Director do Colégio nº 6035- LDA do Calemba -2 Kilamba Kiaxi");
  const decreto = opts.decreto ?? (prim ? "5758/2026 de 12 de Março" : "5733 / 2026 de 12 de Março");
  const docId = prim
    ? `Portador(a) do Boletim de Nascimento / BI Nº ${aluno.bi || "____________"}`
    : `Portador(a) do BI nº ${aluno.bi || "____________________"}, Emitido pela Direcção Nacional de Identificação`;
  y = paragrafo(doc, [
    { t: `${director}, ${escola},`, b: true },
    { t: `criado sob o Decreto Executivo nº ${decreto}, Certifica que` },
    { t: `${aluno.nome},`, b: true, red: true },
    { t: `filho(a) de ${aluno.pai || "____________________"} e de ${aluno.mae || "____________________"}, nascido(a) aos ${aluno.data_nascimento || "____/____/______"}, natural de ${aluno.naturalidade || "____________"}, ${docId}. Concluiu no ano lectivo` },
    { t: `${opts.anoLectivo ?? aluno.ano_lectivo ?? "____/____"},`, b: true },
    { t: "o" },
    { t: prim ? "ENSINO PRIMÁRIO," : "I CICLO DO ENSINO SECUNDÁRIO GERAL,", b: true },
    { t: `conforme o disposto na alínea ${prim ? "b" : "c"}) do Artigo 109º da LBSEE 17/16 de 07 de Outubro, com a média final de` },
    { t: mediaFinal === null ? "(   ) ______ valores" : `(${mediaFinal}) ${porExtenso(mediaFinal)}`, b: true },
    { t: "obtida nas seguintes classificações por ciclos de aprendizagem:" },
  ], 18, y, w - 36, 6);

  const cols = prim ? ["I Ciclo\n2ª", "II Ciclo\n4ª", "III Ciclo\n6ª"] : ["7ª Classe", "8ª Classe", "9ª Classe"];
  autoTable(doc, {
    startY: y + 2,
    head: [["Disciplinas", ...cols, "Média\nFinal", "Média por\nExtenso"]],
    body: linhas.map((l) => [l.d, ...l.vals.map((v) => (v === null ? "" : String(Math.round(v)))), l.mf === null ? "" : String(l.mf), l.mf === null ? "" : porExtenso(l.mf)]),
    theme: "grid",
    styles: { font: "times", fontSize: 10.5, cellPadding: 0.9, textColor: 0, lineColor: 0, lineWidth: 0.2, halign: "center" },
    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: "bold", valign: "middle" },
    columnStyles: { 0: { halign: "left", cellWidth: 56 }, 5: { halign: "left" } },
    margin: { left: 18, right: 18 },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      const l = linhas[data.row.index];
      const c = data.column.index - 1;
      if (c >= 0 && l.sem.includes(c)) data.cell.styles.fillColor = [0, 0, 0];
    },
  });

  const endY = (doc as any).lastAutoTable.finalY + 8;
  const yy = paragrafo(doc, [
    { t: "Para efeitos legais, lhe é passado o Presente" },
    { t: "CERTIFICADO", b: true },
    { t: `que consta no livro de registo nº ${opts.livro ?? (prim ? "03" : "04")},` },
    { t: "Herdeiros do Futuro,", b: true },
    { t: `assinado por mim e autenticado com o Carimbo a óleo em uso neste Estabelecimento de Ensino, ${hojeExtenso()}.` },
  ], 18, endY, w - 36, 6);
  doc.setFont("times", "bold");
  doc.text("Conferido por:", 30, yy + 10);
  doc.text("O Director", w - 60, yy + 10, { align: "center" });
  doc.setFont("times", "normal");
  doc.text("_________________________", 18, yy + 24);
  doc.text("_________________________", w - 60, yy + 24, { align: "center" });
  doc.text(director, w - 60, yy + 30, { align: "center" });
  return doc;
}

/** Compatibilidade: certificado primário a partir de uma lista simples (coloca na coluna da 6ª). */
export function gerarCertificadoPrimarioPDF(aluno: AlunoDoc, notas: NotaLinha[], opts: { anoLectivo?: string } = {}) {
  const m: NotasCiclos = {};
  notas.forEach((n) => { m[n.disciplina] = [null, null, n.valor]; });
  return gerarCertificadoPDF(aluno, "primario", m, opts);
}

/* --------------------- CERTIFICADO DE MÓDULO (ADULTOS) --------------------- */
export function gerarCertificadoModuloPDF(
  aluno: AlunoDoc,
  opts: { directora?: string; escolaNum?: string; decreto?: string; anoLectivo?: string; modulo?: string; mediaFinal?: number } = {},
) {
  const doc = new jsPDF();
  moldura(doc);
  const y0 = cabecalhoOficial(doc, ["República de Angola", "Ministério da Educação", "SUBSISTEMA DE EDUCAÇÃO DE ADULTOS"]);

  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.text("CERTIFICADO", doc.internal.pageSize.getWidth() / 2, y0 + 18, { align: "center" });
  doc.setFont("times", "normal");
  doc.setFontSize(11);

  const dir = opts.directora ?? "Maria Rochana Jeanete Cristina José";
  const texto =
    `${dir}, Directora da Escola Primária nº ${opts.escolaNum ?? "8058"}, criada sob o Decreto Executivo nº ${opts.decreto ?? "306/2021 de 19 de Julho"}. ` +
    `Certifica que ${aluno.nome}, filho(a) de ${aluno.pai ?? "____________"} e de ${aluno.mae ?? "____________"}, ` +
    `nascido(a) aos ${aluno.data_nascimento ?? "__/__/____"}, natural de ${aluno.naturalidade ?? "____________"}, Província de Luanda, ` +
    `portador(a) do Bilhete de Identidade nº ${aluno.bi ?? "____________"}. ` +
    `Concluiu com aproveitamento no ano lectivo ${opts.anoLectivo ?? "____/____"}, o ${opts.modulo ?? "Módulo 3"} equivalente ao Ensino Primário, ` +
    `com a Média Final de (${opts.mediaFinal ? Math.round(opts.mediaFinal) : "  "}) ${opts.mediaFinal ? porExtenso(opts.mediaFinal) : "____________"}, ` +
    `tendo obtido as seguintes classificações finais:`;

  doc.text(doc.splitTextToSize(texto, 168), 20, y0 + 32, { align: "justify", maxWidth: 168 });

  autoTable(doc, {
    startY: y0 + 32 + doc.splitTextToSize(texto, 168).length * 5 + 8,
    head: [["ALFABETIZAÇÃO", "MÓDULO 2", "MÓDULO 3"]],
    body: [["", "", opts.mediaFinal ? `${Math.round(opts.mediaFinal)} (${porExtenso(opts.mediaFinal).replace(" valores", "")})` : ""]],
    theme: "grid",
    styles: { fontSize: 10, minCellHeight: 10, halign: "center" },
    headStyles: { fillColor: [255, 255, 255], textColor: 20, fontStyle: "bold", halign: "center" },
    margin: { left: 24, right: 24 },
  });

  const endY = (doc as any).lastAutoTable.finalY + 12;
  doc.setFontSize(10.5);
  doc.text(
    doc.splitTextToSize(
      "Para efeitos legais, lhe é passado o Presente CERTIFICADO, que consta no livro de termo nº 01, H. Futuro, assinado e autenticado com o carimbo a óleo em uso neste estabelecimento de ensino.",
      168,
    ),
    20,
    endY,
  );
  doc.text(hojeExtenso(), 20, endY + 16);
  assinaturas(doc, endY + 40, "Conferido por:", "A Directora da Escola");
  doc.setFontSize(9);
  doc.text(dir, 118, endY + 52);
  return doc;
}

/* ------------------------------ CARTÃO ESCOLAR ------------------------------ */
export function gerarCartaoEscolarPDF(aluno: AlunoDoc) {
  const doc = novoCartao();
  desenharFrenteCartao(doc, aluno);
  return doc;
}

const novoCartao = () => new jsPDF({ orientation: "landscape", unit: "mm", format: [86, 54] });

function desenharFrenteCartao(doc: jsPDF, aluno: AlunoDoc) {
  // Cartão em formato paisagem 86x54 mm (padrão ID-1), fundo amarelo institucional

  doc.setFillColor(252, 221, 45);
  doc.rect(0, 0, 86, 54, "F");
  doc.setDrawColor(30);
  doc.setLineWidth(0.5);
  doc.rect(2, 2, 82, 50);
  doc.setLineWidth(0.2);
  doc.rect(3.2, 3.2, 79.6, 47.6);

  // Brasão
  doc.setFillColor(245, 225, 150);
  doc.circle(43, 7.5, 2.6, "FD");

  doc.setTextColor(20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("REPÚBLICA DE ANGOLA", 43, 12.5, { align: "center" });
  doc.text("MINISTÉRIO DA EDUCAÇÃO", 43, 15.3, { align: "center" });
  doc.text("GOVERNO PROVINCIAL DE LUANDA", 43, 18.1, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.6);
  doc.text("Complexo Escolar Privado Herdeiros do Futuro", 43, 21.4, { align: "center" });
  doc.setFontSize(6.4);
  doc.text(`CARTÃO DE ESTUDANTE Nº ${aluno.numero_processo ?? ""}`, 43, 25.4, { align: "center" });

  // Ano lectivo (canto superior direito, rodado)
  doc.setFontSize(6);
  doc.text(aluno.ano_lectivo ?? "2025 - 2026", 78, 9, { align: "right", angle: 12 });

  // Foto
  if (aluno.foto) {
    try { doc.addImage(aluno.foto, "JPEG", 60, 27, 20, 22); } catch { /* foto inválida */ }
  } else {
    doc.setDrawColor(60);
    doc.rect(60, 27, 20, 22);
    doc.setFontSize(4.5);
    doc.text("FOTO", 70, 38, { align: "center" });
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.8);
  let y = 30;
  const linha = (label: string, valor: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, 6, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, 6 + doc.getTextWidth(label) + 1, y);
    y += 4.4;
  };
  linha("Nome:", (aluno.nome || "").slice(0, 34));
  linha("Classe:", `${aluno.classe ?? "__"}   Turma: ${aluno.turma ?? "__"}   Sala: ${aluno.sala ?? "__"}   nº ${aluno.numero ?? "__"}`);
  linha("Tel. da Escola:", aluno.tel_escola ?? "———————");
  linha("Tel. do Encarregado:", aluno.tel_encarregado ?? "———————");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("A Direcção", 26, 49, { align: "center" });
  doc.setLineWidth(0.2);
  doc.line(12, 47.5, 40, 47.5);
}

/** Verso do cartão: talão de pagamento de propinas (modelo oficial da escola). */
function desenharVersoCartao(doc: jsPDF, aluno: AlunoDoc, opts: { taxa?: string } = {}) {
  const meses = ["Setembro", "Outubro", "Novembro", "Dezembro", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho"];
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, 86, 54, "F");
  doc.setDrawColor(30);
  doc.setLineWidth(0.5);
  doc.rect(2, 2, 82, 50);
  doc.setLineWidth(0.2);
  doc.rect(3.2, 3.2, 79.6, 47.6);

  doc.setTextColor(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.4);
  doc.text("COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO", 43, 7.5, { align: "center" });
  doc.setFontSize(5);
  doc.text("TALÃO DE PAGAMENTO DE PROPINAS", 43, 11, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.6);
  doc.text(`TAXA  ${aluno.ano_lectivo ?? opts.taxa ?? "____ / ____"}`, 43, 14.5, { align: "center" });
  if (aluno.nome) doc.text(`Nome: ${aluno.nome}`.slice(0, 48), 43, 18, { align: "center" });

  doc.setFontSize(4.4);
  meses.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 8 + col * 27;
    const y = 22.5 + row * 6.4;
    doc.setFont("helvetica", "bold");
    doc.text(m, x, y);
    doc.setFont("helvetica", "normal");
    doc.text("___/___/___", x, y + 3.4);
  });
}

/** Cartão de estudante (frente) com o talão de propinas (verso) num só PDF. */
export function gerarCartaoFrenteVersoPDF(aluno: AlunoDoc, opts: { taxa?: string } = {}) {
  const doc = novoCartao();
  desenharFrenteCartao(doc, aluno);
  doc.addPage([86, 54], "landscape");
  desenharVersoCartao(doc, aluno, opts);
  return doc;
}

export const salvar = (doc: jsPDF, nome: string) => doc.save(nome);

/** Inglês faz parte do currículo a partir da 2ª classe. */
export const temIngles = (classe: string) => !/^\s*(inicia|1\s*ª|1º|1a\b|1 classe)/i.test(classe ?? "");
const PRIMARIA_RE = /^\s*(inicia|[1-6]\s*ª)/i;
export const ehPrimaria = (classe: string) => PRIMARIA_RE.test(classe ?? "");
/** Disciplinas oficiais da classe (boletim, mini pauta). */
export function disciplinasDaClasse(classe: string): string[] {
  if (!ehPrimaria(classe)) return DISCIPLINAS_BOLETIM;
  return temIngles(classe) ? [...DISCIPLINAS_PRIMARIA, "Língua Inglesa"] : DISCIPLINAS_PRIMARIA;
}

export const DISCIPLINAS_PRIMARIA = [
  "Língua Portuguesa", "Matemática", "Estudo do Meio", "Educação Plástica e Visual",
  "Educação Musical", "Educação Física", "Trabalhos Manuais",
];

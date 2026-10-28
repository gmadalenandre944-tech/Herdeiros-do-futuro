/**
 * Modelos HTML editáveis (Declaração, Certificado, Cartão) preenchidos
 * automaticamente com os dados do aluno e as médias lançadas no sistema.
 */
import { notaDe, porExtenso, hojeExtenso } from "@/lib/officialDocs";

export type DadosDoc = {
  nome?: string | null;
  pai?: string | null;
  mae?: string | null;
  data_nascimento?: string | null;
  naturalidade?: string | null;
  bi?: string | null;
  classe?: string | null;
  turma?: string | null;
  sala?: string | null;
  numero?: string | number | null;
  numero_processo?: string | null;
  contacto?: string | null;
  encarregado?: string | null;
  ano_lectivo?: string | null;
};
export type Media = { disciplina: string; media: number };

const L = "____________________";
const v = (x: unknown, vazio = L) => (x === null || x === undefined || x === "" ? vazio : String(x));
const vermelho = (t: string) => `<b style="color:#d00000">${t}</b>`;
const numClasse = (c?: string | null) => Number(String(c ?? "").match(/\d+/)?.[0] ?? 0);
const ORD: Record<number, string> = { 1: "Primeira", 2: "Segunda", 3: "Terceira", 4: "Quarta", 5: "Quinta", 6: "Sexta", 7: "Sétima", 8: "Oitava", 9: "Nona" };
const pad = (n: number) => String(Math.round(n)).padStart(2, "0");
const B = "border:1px solid #000;padding:2px 6px;";

const cabRepublica = (extra: string) => `
  <div style="text-align:center;line-height:1.35;font-size:12pt">
    <div>República de Angola</div><div>Ministério da Educação</div>${extra}
  </div>`;

/* ------------------------------ DECLARAÇÃO ------------------------------ */
export const DISC_DECL_PRIM_1 = ["Língua Portuguesa", "Matemática", "Estudo do Meio", "Educação Manual e Plástica", "Educação Musical", "Educação Física"];
export const DISC_DECL_PRIM_2 = ["Língua Portuguesa", "Matemática", "Ciências da Natureza", "História", "Geografia", "Educação Moral e Cívica", "Educação Manual e Plástica", "Educação Musical", "Educação Física"];
export const DISC_CICLO1 = ["Língua Portuguesa", "Língua Inglesa", "Matemática", "Biologia", "Física", "Química", "Geografia", "História", "Educação Física", "Educação Moral e Cívica", "Educação Visual e Plástica", "Educação Laboral"];

export function declaracaoHtml(a: DadosDoc, medias: Media[], director = "") {
  const n = numClasse(a.classe);
  const discs = n >= 7 ? DISC_CICLO1 : n >= 5 ? DISC_DECL_PRIM_2 : DISC_DECL_PRIM_1;
  const notas = discs.map((d) => ({ d, n: notaDe(medias, d) }));
  const ok = notas.map((x) => x.n).filter((x): x is number => x !== null);
  const max = n >= 7 ? 20 : 10;
  const res = ok.length && ok.reduce((s, x) => s + x, 0) / ok.length < max / 2 ? "Não Transitado" : "Transitado";
  return `
  <div style="text-align:center;line-height:1.35;font-size:12pt">
    REPÚBLICA DE ANGOLA<br/>GOVERNO PROVINCIAL DE LUANDA<br/>ADMINISTRAÇÃO MUNICIPAL DO KILAMBA KIAXI<br/>DIRECÇÃO MUNICIPAL DA EDUCAÇÃO<br/>COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO
  </div>
  <h1 style="text-align:center;font-size:30pt;letter-spacing:4px;margin:24px 0 12px;font-variant:small-caps">Declaração</h1>
  <p style="text-align:justify;line-height:1.7"><b>${v(director, "____________________________")}, Director do Complexo Escolar Privado Herdeiros do Futuro do Município do Kilamba Kiaxi.</b> Declara que ${vermelho(v(a.nome) + ",")} filho(a) de ${v(a.pai)} e de ${v(a.mae)}, nascido(a) aos ${v(a.data_nascimento, "____/____/______")}, natural de ${v(a.naturalidade)}, Frequentou o lectivo ${v(a.ano_lectivo)}, ${n ? `${n}ª Classe (<span style="color:#d00000">${ORD[n] ?? ""} Classe</span>)` : L} na turma ${v(a.turma, "____")}, sala ${v(a.sala, "____")}, Sob nº ${v(a.numero, "____")}, tendo <b>${res}</b> com as seguintes classificações:</p>
  <table style="width:100%;border-collapse:collapse;font-size:12pt">
    <tr><th style="${B}text-align:center">DISCIPLINAS</th><th style="${B}text-align:center">VALORES</th></tr>
    ${notas.map((x) => `<tr><td style="${B}">${x.d}</td><td style="${B}text-align:center"><b>${x.n === null ? "&nbsp;" : `(${pad(x.n)}) ${porExtenso(x.n)}`}</b></td></tr>`).join("")}
  </table>
  <p style="text-align:justify;line-height:1.7;margin-top:14px">Por ser verdade e me ter sido solicitado para <b>efeito de registo</b>, e assim constar nos arquivos desta escola, passa-se a presente declaração que vai por mim assinada e autenticada com carimbo a óleo em uso neste estabelecimento de ensino.</p>
  <p style="margin-top:14px">${hojeExtenso()}</p>
  <p style="text-align:center;margin-top:40px">O Director<br/><br/>_______________________________<br/>${v(director, "")}</p>`;
}

/* ------------------------------ CERTIFICADO ------------------------------ */
const CERT_PRIM: { d: string; ciclos: [boolean, boolean, boolean] }[] = [
  { d: "Língua Portuguesa", ciclos: [true, true, true] },
  { d: "Matemática", ciclos: [true, true, true] },
  { d: "Estudo do Meio", ciclos: [true, true, false] },
  { d: "Ciências da Natureza", ciclos: [false, false, true] },
  { d: "História", ciclos: [false, false, true] },
  { d: "Geografia", ciclos: [false, false, true] },
  { d: "Educação Moral e Cívica", ciclos: [false, false, true] },
  { d: "Educação Manual e Plástica", ciclos: [true, true, true] },
  { d: "Educação Musical", ciclos: [true, true, true] },
  { d: "Educação Física", ciclos: [true, true, true] },
];

export function certificadoHtml(a: DadosDoc, medias: Media[], director = "") {
  const n = numClasse(a.classe);
  const prim = n <= 6;
  const col = prim ? (n <= 2 ? 0 : n <= 4 ? 1 : 2) : n <= 7 ? 0 : n === 8 ? 1 : 2;
  const linhas = prim ? CERT_PRIM : DISC_CICLO1.map((d) => ({ d, ciclos: [true, true, true] as [boolean, boolean, boolean] }));
  const preto = "background:#000;";
  let soma = 0, qt = 0;
  const rows = linhas.map(({ d, ciclos }) => {
    const nota = notaDe(medias, d);
    const cols = [0, 1, 2].map((i) => !ciclos[i] ? `<td style="${B}${preto}"></td>` : `<td style="${B}text-align:center">${i === col && nota !== null ? Math.round(nota) : "&nbsp;"}</td>`).join("");
    if (nota !== null) { soma += nota; qt++; }
    return `<tr><td style="${B}">${d}</td>${cols}<td style="${B}text-align:center">${nota === null ? "&nbsp;" : Math.round(nota)}</td><td style="${B}">${nota === null ? "&nbsp;" : porExtenso(nota)}</td></tr>`;
  }).join("");
  const mf = qt ? Math.round(soma / qt) : null;
  const ensino = prim ? "ENSINO PRIMÁRIO" : "I CICLO DO ENSINO SECUNDÁRIO GERAL";
  const head = prim
    ? `<tr><th style="${B}" rowspan="2">Disciplinas</th><th style="${B}">I Ciclo</th><th style="${B}">II Ciclo</th><th style="${B}">III Ciclo</th><th style="${B}" rowspan="2">Média Final</th><th style="${B}" rowspan="2">Média por Extenso</th></tr><tr><th style="${B}">2ª</th><th style="${B}">4ª</th><th style="${B}">6ª</th></tr>`
    : `<tr><th style="${B}">Disciplinas</th><th style="${B}">7ª Classe</th><th style="${B}">8ª Classe</th><th style="${B}">9ª Classe</th><th style="${B}">Média final</th><th style="${B}">Média por extenso</th></tr>`;
  const extra = prim
    ? `<tr><td style="${B}">Línguas de Origem Africana</td><td style="${B}${preto}" colspan="5"></td></tr>`
    : "";
  return `
  ${cabRepublica(prim ? `<div><b>ENSINO PRIMÁRIO</b></div>` : `<div style="margin-top:12px"><b>I CICLO DO ENSINO SECUNDÁRIO</b></div>`)}
  <h1 style="text-align:center;font-size:30pt;margin:14px 0">CERTIFICADO</h1>
  <p style="text-align:justify;line-height:1.7"><b>${v(director, "____________________________")}, Director do Complexo Escolar Privado Herdeiros do Futuro - Kilamba Kiaxi,</b> criado sob o Decreto Executivo nº ________ de ____ de ________, Certifica que ${vermelho(v(a.nome) + ",")} filho(a) de ${v(a.pai)} e de ${v(a.mae)}, nascido(a) aos ${v(a.data_nascimento, "____/____/______")}, natural de ${v(a.naturalidade)}, Portador(a) do ${prim ? "Boletim de Nascimento" : "BI"} Nº ${v(a.bi)}, Concluiu no ano lectivo <b>${v(a.ano_lectivo)}</b>, o <b>${ensino}</b>, conforme o disposto na alínea ${prim ? "b" : "c)"} do Artigo 109º, da LBSEE 17/16 de 07 de Outubro, com a média final de <b>${mf === null ? "____" : `(${mf}) ${porExtenso(mf)}`}</b> obtida nas seguintes classificações por ciclos de aprendizagem:</p>
  <table style="width:100%;border-collapse:collapse;font-size:11pt">${head}${rows}${extra}</table>
  <p style="text-align:justify;line-height:1.7;margin-top:14px">Para efeitos legais, lhe é passado o Presente <b>CERTIFICADO</b> que consta no livro de registo nº ____, <b>Herdeiros do Futuro</b> folhas/____, assinado por mim e autenticado com o Carimbo a óleo em uso neste Estabelecimento de Ensino, ${hojeExtenso()}.</p>
  <p style="text-align:center;margin-top:40px">O Director<br/><br/>_______________________________<br/>${v(director, "")}</p>`;
}

/* ------------------------------ CARTÃO ------------------------------ */
export function cartaoHtml(a: DadosDoc) {
  const meses = ["Setembro", "Outubro", "Novembro", "Dezembro", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "TAXA"];
  const box = "border:1px solid #000;padding:10px;width:340px;vertical-align:top;font-family:Arial,sans-serif;font-size:10pt";
  return `
  <table style="border-collapse:separate;border-spacing:12px;margin:0 auto"><tr>
    <td style="${box}">
      <div style="text-align:center;line-height:1.3">REPÚBLICA DE ANGOLA<br/>MINISTÉRIO DA EDUCAÇÃO<br/>GOVERNO PROVINCIAL DE LUANDA<br/><b style="font-size:8pt">COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO</b></div>
      <p style="text-align:center;margin:10px 0 6px"><b>CARTÃO DE ESTUDANTE Nº ${v(a.numero_processo, "______")}</b></p>
      <table style="width:100%;border-collapse:collapse;font-size:10pt"><tr><td style="vertical-align:top;line-height:1.9">
        Nome: <b style="color:#d00000">${v(a.nome)}</b><br/>
        Classe: ${v(a.classe, "____")} Turma: ${v(a.turma, "____")} Sala: ${v(a.sala, "____")} nº ${v(a.numero, "___")}<br/>
        Tel. da Escola: ________________<br/>
        Tel. do Encarregado: ${v(a.contacto, "________________")}
      </td><td style="width:80px;vertical-align:bottom"><div style="border:1px solid #000;width:76px;height:90px;text-align:center;line-height:90px">PHOTO</div></td></tr></table>
      <table style="width:100%;margin-top:14px;font-size:10pt"><tr><td><b>O Encarregado</b><br/>____________</td><td style="text-align:right"><b>A Direcção</b><br/>____________</td></tr></table>
    </td>
    <td style="${box}">
      <div style="text-align:center;line-height:1.3"><b style="font-size:8pt">COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO</b><br/><b>TALÃO DE PAGAMENTO DE PROPINAS</b></div>
      <p style="margin:6px 0">Nome: <b>${v(a.nome)}</b></p>
      <table style="width:100%;border-collapse:collapse;text-align:center;font-size:9pt">
        ${[0, 3, 6, 9].map((i) => `<tr>${meses.slice(i, i + 3).map((m) => `<td style="border:1px solid #000;padding:4px">${m}<br/>${m === "TAXA" ? "&nbsp;" : "___/___/___"}</td>`).join("")}</tr>`).join("")}
      </table>
      <p style="text-align:center;margin:6px 0 0">${v(a.ano_lectivo, "____/____")}</p>
    </td>
  </tr></table>`;
}

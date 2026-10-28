import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INSIGNIA, INSIGNIA_RATIO } from "./insignia";

export interface PdfSection {
  title: string;
  subtitle?: string;
  head: string[];
  body: (string | number)[][];
  /** Linhas de resumo destacadas no fim da tabela (ex: Média, Resultado). */
  foot?: (string | number)[][];
  /** Nota mínima: valores numéricos abaixo dela ficam a vermelho. */
  minimo?: number;
  /** Assinaturas no fim da página. */
  assinaturas?: string[];
}

const VERDE: [number, number, number] = [31, 78, 61];

/** Gera e descarrega um PDF oficial (estilo folha de cálculo) com uma ou mais tabelas. */
export function downloadTablesPdf(filename: string, docTitle: string, sections: PdfSection[], landscape = false) {
  const doc = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  sections.forEach((s, i) => {
    if (i > 0) doc.addPage();
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    try { doc.addImage(INSIGNIA, "JPEG", 40, 14, 40 * INSIGNIA_RATIO, 40); } catch { /* ignore */ }
    doc.setFontSize(9);
    doc.text("REPÚBLICA DE ANGOLA · MINISTÉRIO DA EDUCAÇÃO", width / 2, 32, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("COMPLEXO ESCOLAR PRIVADO HERDEIROS DO FUTURO", width / 2, 50, { align: "center" });
    doc.setFillColor(...VERDE);
    doc.rect(40, 60, width - 80, 20, "F");
    doc.setTextColor(255);
    doc.setFontSize(11);
    doc.text(docTitle, width / 2, 74, { align: "center" });
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(s.title, 40, 98, { maxWidth: width - 80 });
    if (s.subtitle) doc.text(s.subtitle, 40, 112, { maxWidth: width - 80 });
    autoTable(doc, {
      startY: s.subtitle ? 122 : 108,
      head: [s.head],
      body: s.body.map((r) => r.map((c) => String(c))),
      foot: s.foot?.map((r) => r.map((c) => String(c))),
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 4, lineColor: [170, 180, 175], lineWidth: 0.5, textColor: 20 },
      headStyles: { fillColor: VERDE, textColor: 255, fontStyle: "bold", halign: "center" },
      footStyles: { fillColor: [226, 236, 231], textColor: 20, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [244, 248, 246] },
      margin: { left: 40, right: 40, bottom: 50 },
      didParseCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index > 0) data.cell.styles.halign = "center";
        const v = Number(String(data.cell.raw).replace(",", "."));
        if (s.minimo !== undefined && data.column.index > 1 && !Number.isNaN(v) && String(data.cell.raw).trim() !== "" && v < s.minimo) {
          data.cell.styles.textColor = [200, 30, 30];
        }
      },
    });
    if (s.assinaturas?.length) {
      const y = Math.min((doc as any).lastAutoTable.finalY + 60, height - 70);
      const w = (width - 80) / s.assinaturas.length;
      s.assinaturas.forEach((a, k) => {
        const x = 40 + k * w;
        doc.line(x + 15, y, x + w - 15, y);
        doc.text(a, x + w / 2, y + 12, { align: "center" });
      });
    }
  });
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-PT")} · Página ${p}/${pages}`, width / 2, height - 24, { align: "center" });
  }
  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

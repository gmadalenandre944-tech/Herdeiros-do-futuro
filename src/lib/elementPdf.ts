import jsPDF from "jspdf";

/**
 * Descarrega em PDF exactamente o mesmo documento que sai na impressão.
 * Clona o elemento (mesmo escondido), renderiza-o fora do ecrã e coloca-o em páginas A4.
 */
export async function downloadElementPdf(selector: string, filename: string, landscape = false, format: "a4" | "a7" = "a4") {
  const src = document.querySelector<HTMLElement>(selector);
  if (!src) throw new Error("Documento não encontrado.");
  const { default: html2canvas } = await import("html2canvas-pro");
  const pageWmm = landscape ? 297 : 210;
  const pageHmm = landscape ? 210 : 297;
  const margin = 8;
  const pxWidth = Math.round(((pageWmm - margin * 2) / 25.4) * 96);

  const holder = document.createElement("div");
  holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${pxWidth}px;background:#fff;z-index:-1;`;
  const clone = src.cloneNode(true) as HTMLElement;
  clone.classList.remove("hidden");
  clone.style.cssText = "display:block !important;position:static;visibility:visible;width:100%;background:#fff;padding:4px;";
  holder.appendChild(clone);
  document.body.appendChild(holder);
  try {
    await Promise.all(Array.from(clone.querySelectorAll("img")).map((i) => (i.complete ? null : i.decode().catch(() => null))));
    const canvas = await html2canvas(clone, { scale: format === "a7" ? 3 : 2, backgroundColor: "#ffffff", useCORS: true, width: pxWidth, windowWidth: pxWidth });
    if (format === "a7") {
      // Mesmo modelo da impressão: documento inteiro numa folha A7 (74×105 mm).
      const pdf7 = new jsPDF({ orientation: "portrait", unit: "mm", format: "a7" });
      const m = 3, w = 74 - m * 2, hMax = 105 - m * 2;
      let iw = w, ih = (canvas.height / canvas.width) * w;
      if (ih > hMax) { ih = hMax; iw = (canvas.width / canvas.height) * hMax; }
      pdf7.addImage(canvas.toDataURL("image/png"), "PNG", (74 - iw) / 2, m, iw, ih);
      pdf7.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
      return;
    }
    const pdf = new jsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "a4" });
    const usableW = pageWmm - margin * 2;
    const usableH = pageHmm - margin * 2;
    const pxPerMm = canvas.width / usableW;
    const sliceH = Math.floor(usableH * pxPerMm);
    for (let y = 0, p = 0; y < canvas.height; y += sliceH, p++) {
      const h = Math.min(sliceH, canvas.height - y);
      const part = document.createElement("canvas");
      part.width = canvas.width;
      part.height = h;
      part.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (p > 0) pdf.addPage();
      pdf.addImage(part.toDataURL("image/jpeg", 0.95), "JPEG", margin, margin, usableW, h / pxPerMm);
    }
    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    holder.remove();
  }
}

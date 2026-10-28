import * as XLSX from "xlsx";

/** Gera e descarrega um ficheiro Excel (.xlsx) a partir de linhas. */
export function downloadExcel(filename: string, sheetName: string, rows: (string | number | null)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const widths = rows.reduce<number[]>((w, r) => { r.forEach((c, i) => { w[i] = Math.max(w[i] ?? 8, Math.min(45, String(c ?? "").length + 2)); }); return w; }, []);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

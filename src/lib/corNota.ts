/**
 * Cor da nota na pauta/boletim (igual ao modelo da escola):
 * vermelho = negativa (abaixo do mínimo), verde = positiva.
 */
export function corNota(v: number | string | null | undefined, min: number, _max?: number): "" | "nota-vermelha" | "nota-verde" {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(String(v).replace(",", "."));
  if (Number.isNaN(n)) return "";
  return n < min ? "nota-vermelha" : "nota-verde";
}

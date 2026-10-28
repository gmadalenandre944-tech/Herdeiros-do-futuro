export type PaymentRecord = {
  id: string;
  aluno_id: string;
  mes: number;
  ano_referencia: number | null;
  valor_pago: number;
  pago: boolean;
  tipo: string;
  data_pagamento: string | null;
};

export const MESES_PAGAMENTO = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
] as const;

const normalizarTextoMes = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .trim();

/** Aceita meses guardados como número, nome completo ou abreviatura em português. */
export const normalizarMesPagamento = (value: unknown): number => {
  const raw = String(value ?? "").trim();
  const numeric = Number(raw);
  if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) return numeric;

  const normalized = normalizarTextoMes(raw);
  const index = MESES_PAGAMENTO.findIndex((month) => {
    const monthText = normalizarTextoMes(month);
    return normalized === monthText ||
      normalized === monthText.slice(0, 3) ||
      (normalized.length > 3 && monthText.startsWith(normalized.slice(0, 3)));
  });
  return index < 0 ? 0 : index + 1;
};

/** ISO date without the UTC conversion shifting the local receipt date. */
export const dataPagamentoHoje = () => {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  const dia = String(hoje.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
};

export const normalizarPagamento = (row: any): PaymentRecord => ({
  id: String(row?.id ?? ""),
  aluno_id: String(row?.aluno_id ?? ""),
  mes: normalizarMesPagamento(row?.mes),
  ano_referencia: Number.isInteger(Number(row?.ano_referencia)) && row?.ano_referencia != null
    ? Number(row.ano_referencia)
    : null,
  valor_pago: Number(row?.valor_pago ?? row?.valor ?? 0),
  pago: row?.pago === true,
  tipo: String(row?.tipo ?? "propina"),
  data_pagamento: row?.data_pagamento ? String(row.data_pagamento) : null,
});

export const anoReferenciaPagamento = (pagamento: PaymentRecord) => {
  if (pagamento.ano_referencia && Number.isInteger(pagamento.ano_referencia)) {
    return pagamento.ano_referencia;
  }
  // Compatibilidade para registos anteriores à migração: a data real é a
  // única informação disponível para estimar o ano de referência.
  const ano = pagamento.data_pagamento?.slice(0, 4);
  return ano && /^\d{4}$/.test(ano) ? Number(ano) : null;
};

export const periodoPagamento = (pagamento: PaymentRecord) => {
  const mes = MESES_PAGAMENTO[pagamento.mes - 1];
  const ano = anoReferenciaPagamento(pagamento);
  if (!mes) return "Referência não indicada";
  if (!ano) return `${mes} (ano não indicado)`;
  return `${mes} de ${ano}${pagamento.ano_referencia == null ? " *" : ""}`;
};

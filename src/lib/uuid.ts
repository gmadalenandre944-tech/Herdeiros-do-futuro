const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

/** IDs válidos: UUID ou inteiro positivo (a base da escola usa IDs numéricos). */
export const isValidId = (value: unknown): boolean =>
  isUuid(value) || /^[1-9]\d*$/.test(String(value ?? "").trim());

export const requireUuid = (value: unknown, label = "ID do aluno"): string => {
  if (!isValidId(value)) {
    throw new Error(`${label} inválido.`);
  }
  return String(value).trim();
};

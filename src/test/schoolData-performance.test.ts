import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ from: vi.fn(), tables: {} as Record<string, Record<string, unknown>[]> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mock.from } }));

import { fetchAlunos, fetchBaseEscolar, invalidateSchoolData } from "@/lib/schoolData";

beforeEach(() => {
  invalidateSchoolData();
  mock.tables = {
    vw_alunos_ordenados: [{ id: "student-1", nome_completo: "Ana", turma_id: "class-1" }],
    turmas: [{ id: "class-1", nome: "A", classe_id: "level-1" }],
    disciplinas: [],
    classes: [{ id: "level-1", nome: "1ª Classe" }],
    matriculas: [{ id: "student-1", turma_id: "class-1" }],
  };
  mock.from.mockReset();
  mock.from.mockImplementation((table: string) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn(async (start: number, end: number) => ({
        data: (mock.tables[table] ?? []).slice(start, end + 1),
        error: null,
        count: start === 0 ? (mock.tables[table] ?? []).length : null,
      })),
    };
    return query;
  });
});

describe("School loading avoids redundant reads", () => {
  it("skips matriculations when all student class links are present", async () => {
    const result = await fetchBaseEscolar();
    expect(mock.from.mock.calls.map(([table]) => table)).not.toContain("matriculas");
    expect(result.alunos[0]).toMatchObject({ id: "student-1", turma_id: "class-1", turma_nome: "A", classe: "1ª Classe" });
  });

  it("still recovers a missing student class link from matriculations", async () => {
    mock.tables.vw_alunos_ordenados[0].turma_id = null;
    const result = await fetchBaseEscolar();
    expect(mock.from.mock.calls.map(([table]) => table)).toContain("matriculas");
    expect(result.alunos[0].turma_id).toBe("class-1");
  });

  it("loads every page but requests an exact total only once", async () => {
    mock.tables.vw_alunos_ordenados = Array.from({ length: 1001 }, (_, i) => ({ id: `student-${i}`, nome_completo: `Student ${i}` }));
    const result = await fetchAlunos();
    expect(result).toHaveLength(1001);
    expect(result.some((row) => row.id === "student-1000")).toBe(true);
    const queries = mock.from.mock.results.map((result) => result.value);
    expect(queries[0].select).toHaveBeenCalledWith("*", { count: "exact" });
    expect(queries[1].select).toHaveBeenCalledWith("*");
    expect(queries).toHaveLength(2);
  });

  it("after a save or account change, student data is read fresh", async () => {
    await fetchBaseEscolar();
    invalidateSchoolData();
    mock.tables.vw_alunos_ordenados = [{ id: "student-2", nome_completo: "Beatriz", turma_id: "class-1" }];
    const result = await fetchBaseEscolar();
    expect(result.alunos.map((row) => row.id)).toEqual(["student-2"]);
  });
});
describe("leituras partilhadas", () => {
  it("dois ecrãs a pedir os alunos ao mesmo tempo fazem um só pedido", async () => {
    await Promise.all([fetchAlunos(), fetchAlunos()]);
    expect(mock.from.mock.calls.filter(([t]) => t === "vw_alunos_ordenados")).toHaveLength(1);
  });

  it("depois de gravar, a leitura seguinte vai buscar dados novos", async () => {
    await fetchAlunos();
    invalidateSchoolData();
    await fetchAlunos();
    expect(mock.from.mock.calls.filter(([t]) => t === "vw_alunos_ordenados")).toHaveLength(2);
  });

  it("2500 alunos com páginas de 1000 são lidos em 3 páginas", async () => {
    mock.tables.vw_alunos_ordenados = Array.from({ length: 2500 }, (_, i) => ({ id: `s${i}`, nome_completo: `A${i}` }));
    const alunos = await fetchAlunos();
    expect(alunos).toHaveLength(2500);
    expect(mock.from.mock.calls.filter(([t]) => t === "vw_alunos_ordenados")).toHaveLength(3);
  });
});
describe("abrir páginas com dados já lidos", () => {
  it("uma visita 1 minuto depois mostra logo os dados anteriores e atualiza em segundo plano", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      await fetchAlunos();
      mock.tables.vw_alunos_ordenados = [{ id: "student-9", nome_completo: "Zé", turma_id: "class-1" }];
      vi.setSystemTime(Date.now() + 60_000);
      const instant = await fetchAlunos();
      expect(instant.map((a) => a.id)).toEqual(["student-1"]);
      expect(mock.from.mock.calls.filter(([t]) => t === "vw_alunos_ordenados")).toHaveLength(2);
      await new Promise((r) => setTimeout(r, 0));
      const next = await fetchAlunos();
      expect(next.map((a) => a.id)).toEqual(["student-9"]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("depois de 5 minutos espera por dados novos", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      await fetchAlunos();
      mock.tables.vw_alunos_ordenados = [{ id: "student-9", nome_completo: "Zé", turma_id: "class-1" }];
      vi.setSystemTime(Date.now() + 6 * 60_000);
      const result = await fetchAlunos();
      expect(result.map((a) => a.id)).toEqual(["student-9"]);
    } finally {
      vi.useRealTimers();
    }
  });
});

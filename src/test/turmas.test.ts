import { describe, it, expect } from "vitest";
import { normalizeClasseOficial, turmaLetra, codigoTurma, filtrarPorClasseTurma } from "@/lib/schoolData";

describe("turmas 5A/5B/6A/6B", () => {
  it("classe com turma no nome conta como a classe", () => {
    expect(normalizeClasseOficial("5ª Classe Turma A")).toBe("5ª Classe");
    expect(normalizeClasseOficial("6ª Classe B")).toBe("6ª Classe");
  });
  it("lê a letra da turma", () => {
    expect(turmaLetra({ classe: "5ª Classe Turma A" })).toBe("A");
    expect(turmaLetra({ classe: "6ª Classe B" })).toBe("B");
    expect(turmaLetra({ classe: "5ª Classe", turma: "B" })).toBe("B");
    expect(codigoTurma({ classe: "6ª Classe A" })).toBe("6A");
  });
  it("filtra 5A sem misturar 5B", () => {
    const l = [{ classe: "5ª Classe Turma A" }, { classe: "5ª Classe B" }, { classe: "6ª Classe A" }];
    expect(filtrarPorClasseTurma(l, "5ª Classe", "A")).toHaveLength(1);
    expect(filtrarPorClasseTurma(l, "5ª Classe", "Todas")).toHaveLength(2);
  });
});

import { describe, expect, test } from "vitest";
import { disciplinasDaClasse } from "@/lib/officialDocs";

const temIngles = (c: string) => disciplinasDaClasse(c).some((d) => /ingl/i.test(d));

describe("Inglês no boletim", () => {
  test("não aparece na Iniciação nem na 1ª classe", () => {
    expect(temIngles("Iniciação")).toBe(false);
    expect(temIngles("1ª Classe")).toBe(false);
  });
  test("aparece da 2ª classe em diante", () => {
    expect(temIngles("2ª Classe")).toBe(true);
    expect(temIngles("6ª Classe")).toBe(true);
    expect(temIngles("7ª Classe")).toBe(true);
  });
});

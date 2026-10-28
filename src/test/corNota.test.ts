import { describe, it, expect } from "vitest";
import { corNota } from "@/lib/corNota";

describe("corNota", () => {
  it("escala 0-20: abaixo de 10 é vermelho", () => expect(corNota(9.9, 10, 20)).toBe("nota-vermelha"));
  it("escala 0-20: 10 ou mais é verde", () => expect(corNota(10, 10, 20)).toBe("nota-verde"));
  it("escala 0-10: 4 é vermelho, 5 é verde", () => {
    expect(corNota(4, 5, 10)).toBe("nota-vermelha");
    expect(corNota(5, 5, 10)).toBe("nota-verde");
  });
  it("sem nota não tem cor", () => expect(corNota("", 10, 20)).toBe(""));
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mock.from } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn() } }));

import { clearUserRoleCache, getUserRole } from "@/hooks/useUserRole";

beforeEach(() => {
  clearUserRoleCache();
  mock.from.mockReset();
  mock.from.mockImplementation((table: string) => {
    const q: any = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      limit: vi.fn(() => q),
      insert: vi.fn(async () => ({ error: null })),
      maybeSingle: vi.fn(async () => ({
        data: table === "user_roles" ? { role: "professor" } : null,
        error: null,
      })),
    };
    return q;
  });
});

describe("função do utilizador partilhada", () => {
  it("vários ecrãs ao mesmo tempo fazem uma só leitura da função", async () => {
    const user = { id: "prof-1" };
    const roles = await Promise.all([getUserRole(user), getUserRole(user), getUserRole(user), getUserRole(user)]);
    expect(roles).toEqual(["professor", "professor", "professor", "professor"]);
    expect(mock.from.mock.calls.filter(([t]) => t === "user_roles")).toHaveLength(1);
  });

  it("mudar de página depois reutiliza a função já conhecida", async () => {
    const user = { id: "prof-1" };
    await getUserRole(user);
    mock.from.mockClear();
    expect(await getUserRole(user)).toBe("professor");
    expect(mock.from).not.toHaveBeenCalled();
  });
});

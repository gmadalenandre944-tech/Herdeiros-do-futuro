import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type AppRole = "admin" | "professor" | "aluno" | "encarregado" | "secretario";

const ROLES: AppRole[] = ["admin", "professor", "aluno", "encarregado", "secretario"];

/**
 * A função do utilizador é lida uma única vez por sessão e partilhada por todos
 * os componentes (guarda de acesso, cabeçalho, notificações...). Antes cada um
 * repetia as mesmas consultas em cada mudança de página.
 */
const roleCache = new Map<string, AppRole | null>();
const rolePending = new Map<string, Promise<AppRole | null>>();

export const clearUserRoleCache = () => {
  roleCache.clear();
  rolePending.clear();
};

const isNetworkError = (error: any) => /fetch|network|timeout/i.test(String(error?.message));

async function loadRole(user: { id: string; user_metadata?: any }): Promise<AppRole | null> {
  const metaRole = (user.user_metadata as any)?.role as AppRole | undefined;
  const fallback: AppRole = metaRole && ROLES.includes(metaRole) ? metaRole : "aluno";
  try {
    let data: any = null;
    let error: any = null;
    let staff: any = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      // As duas leituras são independentes: fazê-las em paralelo.
      const [roleRes, staffRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1).maybeSingle(),
        supabase.from("staff_profiles").select("role,status").eq("user_id", user.id).maybeSingle(),
      ]);
      ({ data, error } = roleRes);
      staff = staffRes.data;
      if (!error || !isNetworkError(error)) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    if (error) {
      // Sem resposta válida da base de dados: usar a função guardada na conta.
      if (metaRole && (isNetworkError(error) || !error?.code)) {
        console.warn("[useUserRole] ligação instável, a usar função da conta:", metaRole);
        return fallback;
      }
      throw error;
    }
    const staffRole = (staff as any)?.role as AppRole | undefined;
    if (data?.role && !(data.role === "aluno" && staffRole && staffRole !== "aluno")) {
      return data.role as AppRole;
    }
    if (staffRole && ["admin", "professor", "secretario"].includes(staffRole)) {
      await supabase.from("user_roles").insert({ user_id: user.id, role: staffRole });
      return staffRole;
    }
    const { error: insertError } = await supabase.from("user_roles").insert({ user_id: user.id, role: fallback });
    if (insertError) {
      console.error("[useUserRole] não foi possível persistir a função de fallback:", insertError);
      toast.warning(`A sessão continuará com o perfil “${fallback}”, mas não foi possível guardar a função: ${insertError.message}`);
    }
    return fallback;
  } catch (error: any) {
    console.error("[useUserRole] falha ao carregar/criar função:", error);
    if (metaRole && ROLES.includes(metaRole)) return metaRole;
    toast.error(`Não foi possível carregar o perfil de acesso: ${error?.message ?? "verifique a ligação."}`);
    return null;
  }
}

export function getUserRole(user: { id: string; user_metadata?: any }) {
  if (roleCache.has(user.id)) return Promise.resolve(roleCache.get(user.id) ?? null);
  let pending = rolePending.get(user.id);
  if (!pending) {
    pending = loadRole(user).then((role) => {
      rolePending.delete(user.id);
      // Só guardar sucessos; um erro volta a ser tentado na próxima página.
      if (role) roleCache.set(user.id, role);
      return role;
    });
    rolePending.set(user.id, pending);
  }
  return pending;
}

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const cached = userId ? roleCache.get(userId) : undefined;
  const [state, setState] = useState<{ userId: string | null; role: AppRole | null; loading: boolean }>(() => ({
    userId,
    role: cached ?? null,
    loading: cached === undefined,
  }));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      clearUserRoleCache();
      setState({ userId: null, role: null, loading: false });
      return;
    }
    const hit = roleCache.get(user.id);
    if (hit !== undefined) {
      setState({ userId: user.id, role: hit, loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => (s.userId === user.id && s.loading ? s : { userId: user.id, role: null, loading: true }));
    getUserRole(user).then((role) => {
      if (!cancelled) setState({ userId: user.id, role, loading: false });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading]);

  if (authLoading) return { role: null, loading: true, user };
  if (!userId) return { role: null, loading: false, user };
  // Já conhecida nesta sessão: devolver de imediato, sem ecrã de espera.
  if (cached !== undefined) return { role: cached, loading: false, user };
  return { role: state.userId === userId ? state.role : null, loading: state.userId !== userId || state.loading, user };
};

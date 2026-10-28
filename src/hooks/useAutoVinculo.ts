import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";
import { fetchAlunos, slugNome, type Aluno } from "@/lib/schoolData";
import { toast } from "sonner";

const db = (t: string): any => (supabase as any).from(t);

// O vínculo é verificado uma vez por sessão (lê toda a lista de alunos);
// as páginas seguintes reutilizam o resultado em vez de repetir a verificação.
const vinculoCache = new Map<string, Promise<VinculoState>>();

export interface VinculoState {
  loading: boolean;
  aluno: Aluno | null;
  educandos: Aluno[];
  verificado: boolean;
}

/**
 * Verificação automática do utilizador contra a base de alunos importada.
 * - Aluno: procura o seu registo por nº de processo, ou nome + data de nascimento, ou nome único.
 * - Encarregado: liga automaticamente os educandos já associados ou cujo campo
 *   "encarregado" na tabela alunos corresponde ao seu nome.
 */
export const useAutoVinculo = (): VinculoState => {
  const { user, role, loading: roleLoading } = useUserRole();
  const [state, setState] = useState<VinculoState>({
    loading: true,
    aluno: null,
    educandos: [],
    verificado: false,
  });

  useEffect(() => {
    if (roleLoading) return;
    if (!user || !role || (role !== "aluno" && role !== "encarregado")) {
      setState({ loading: false, aluno: null, educandos: [], verificado: false });
      return;
    }

    let cancelled = false;

    const run = async (): Promise<VinculoState> => {
      const { data: profile, error: profileError } = await db("profiles").select("*").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      const alunos = await fetchAlunos();

      if (role === "aluno") {
        const proc = profile?.numero_processo?.toString().trim();
        const nome = slugNome(profile?.nome ?? (user.user_metadata as any)?.nome ?? "");
        const nasc = profile?.data_nascimento ?? null;

        let match: Aluno | undefined;
        if (proc) match = alunos.find((a) => (a.numero_processo ?? "").toString().trim() === proc);
        if (!match && nome && nasc)
          match = alunos.find((a) => slugNome(a.nome) === nome && a.data_nascimento === nasc);
        if (!match && nome) {
          const iguais = alunos.filter((a) => slugNome(a.nome) === nome);
          if (iguais.length === 1) match = iguais[0];
        }

        if (match) {
          const { error } = await db("profiles").update({ aluno_id: match.id }).eq("id", user.id);
          if (error) {
            console.error("[useAutoVinculo] não foi possível persistir aluno_id no perfil:", error);
            toast.warning("O aluno foi identificado, mas o vínculo não pôde ser guardado no perfil. Contacte a Secretaria.");
          }
        }
        return { loading: false, aluno: match ?? null, educandos: [], verificado: !!match };
      }

      // Encarregado
      const { data: links, error: linksError } = await db("encarregado_alunos").select("aluno_id").eq("encarregado_id", user.id);
      if (linksError) throw linksError;
      let ids: string[] = (links ?? []).map((l: any) => l.aluno_id);

      if (ids.length === 0) {
        const nome = slugNome(profile?.nome ?? "");
        const candidatos = nome
          ? alunos.filter((a) => slugNome(String(a.raw?.encarregado ?? a.raw?.nome_encarregado ?? "")) === nome)
          : [];
        if (candidatos.length > 0) {
          const { error } = await db("encarregado_alunos").insert(
            candidatos.map((c) => ({ encarregado_id: user.id, aluno_id: c.id }))
          );
          if (error) throw error;
          ids = candidatos.map((c) => c.id);
        }
      }

      const educandos = alunos.filter((a) => ids.includes(a.id));
      return { loading: false, aluno: null, educandos, verificado: educandos.length > 0 };
    };

    const key = `${user.id}:${role}`;
    let pending = vinculoCache.get(key);
    if (!pending) {
      pending = run();
      vinculoCache.set(key, pending);
      pending.catch(() => vinculoCache.delete(key));
    }

    pending.then((result) => {
      if (!cancelled) setState(result);
    }).catch((error: any) => {
      console.error("[useAutoVinculo] falha ao verificar vínculo:", error);
      if (!cancelled) {
        setState({ loading: false, aluno: null, educandos: [], verificado: false });
        toast.error(`Não foi possível verificar o vínculo do aluno: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, role, roleLoading]);

  return state;
};

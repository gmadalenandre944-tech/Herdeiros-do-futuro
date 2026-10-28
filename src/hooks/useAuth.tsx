import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

/**
 * Sessão partilhada por todo o sistema: uma única subscrição e uma única
 * leitura inicial, em vez de uma por cada componente que precisa do utilizador.
 * Ao mudar de página o utilizador já é conhecido, sem novo ecrã de espera.
 */
type AuthSnapshot = { user: User | null; loading: boolean };

let snapshot: AuthSnapshot = { user: null, loading: true };
let started = false;
const listeners = new Set<() => void>();

const setSnapshot = (user: User | null) => {
  // A renovação do token devolve um objeto novo para o mesmo utilizador: ignorar
  // para não repetir consultas em todos os ecrãs.
  if (
    !snapshot.loading &&
    snapshot.user?.id === user?.id &&
    snapshot.user?.updated_at === user?.updated_at
  ) return;
  snapshot = { user, loading: false };
  listeners.forEach((l) => l());
};

// Contas antigas guardavam a foto de perfil dentro da sessão: a sessão fica tão
// grande que a base de dados recusa todos os pedidos. Renovar a sessão gera uma
// nova, pequena, assim que a foto for retirada da conta na base de dados.
const MAX_TOKEN = 8000;
let avisoMostrado = false;
const corrigirSessaoGrande = async (session: Session | null) => {
  if (!session || session.access_token.length <= MAX_TOKEN) return;
  const { data } = await supabase.auth.refreshSession();
  if ((data.session?.access_token.length ?? 0) <= MAX_TOKEN) return;
  if (avisoMostrado) return;
  avisoMostrado = true;
  toast.error("Esta conta não consegue ligar à base de dados", {
    description: "A foto de perfil antiga está guardada dentro da sessão. O administrador deve executar a correção (docs/sql/remover_foto_da_sessao.sql) no Supabase e depois recarregar a página.",
    duration: Infinity,
  });
};

const start = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  supabase.auth.onAuthStateChange((event, session) => {
    setSnapshot(session?.user ?? null);
    if (event === "SIGNED_IN") void corrigirSessaoGrande(session);
  });
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSnapshot(session?.user ?? null);
    void corrigirSessaoGrande(session);
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const serverSnapshot: AuthSnapshot = { user: null, loading: true };

export const useAuth = () => {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  useEffect(start, []);
  return state;
};

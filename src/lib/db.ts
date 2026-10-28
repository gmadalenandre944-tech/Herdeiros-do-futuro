import { supabase } from "@/integrations/supabase/client";

/**
 * Acesso não tipado a tabelas cujo esquema real difere dos tipos gerados.
 * IMPORTANTE: usar sempre esta função em vez de `supabase.from as any`,
 * que perde o `this` do cliente e rebenta em runtime.
 */
export const db = (table: string): any => (supabase as any).from(table);

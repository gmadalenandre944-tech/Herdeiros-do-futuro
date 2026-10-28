import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchListaOficial, guardarLinha, eliminarLinha, type LinhaListaOficial, type EdicaoLinha } from "@/lib/listasOficiais";
import { registarAlunoCompleto, type StudentInsertInput } from "@/lib/students";
import { sortStudents } from "@/lib/studentOrder";

type AddInput = StudentInsertInput & { numeroProcesso?: string };
type Change = { kind: "add"; input: AddInput } | { kind: "update"; linha: LinhaListaOficial; data: EdicaoLinha } | { kind: "delete"; linha: LinhaListaOficial };

export function useOfficialRoster() {
  const { user, loading: authLoading } = useAuth();
  const client = useQueryClient();
  const userId = user?.id;
  const queryKey = ["official-roster", userId] as const;
  const mutationKey = ["official-roster-change", userId] as const;
  const query = useQuery({ queryKey, queryFn: () => fetchListaOficial(), enabled: Boolean(userId), staleTime: 30_000, refetchOnWindowFocus: true });
  const mutation = useMutation({
    mutationKey,
    scope: { id: `official-roster-${userId}` },
    mutationFn: async (change: Change) => {
      if (!userId) throw new Error("Inicie sessão para alterar alunos.");
      if (change.kind === "add") return registarAlunoCompleto(change.input);
      if (change.kind === "update") return guardarLinha(change.linha, change.data);
      return eliminarLinha(change.linha);
    },
    onMutate: async (change) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<LinhaListaOficial[]>(queryKey) ?? [];
      const temporaryKey = `pending-${crypto.randomUUID()}`;
      let rows = previous;
      if (change.kind === "add") {
        const f = change.input;
        rows = [...previous, { key: temporaryKey, id: temporaryKey, tabela: "matriculas", tipo: "Matrícula", nome_completo: f.fullName.trim(), numero_processo: f.numeroProcesso ?? "", idade: f.idade ?? null, data_nascimento: f.birthDate ?? "", genero: f.gender ?? "", classe: f.classe ?? "Sem classe", turma: f.turma?.trim() || "Turma Única" }];
      } else if (change.kind === "update") rows = previous.map((row) => row.key === change.linha.key ? { ...row, ...change.data } : row);
      else rows = previous.filter((row) => row.key !== change.linha.key);
      client.setQueryData(queryKey, sortStudents(rows));
      return { previous, temporaryKey };
    },
    onError: (_error, change, context) => {
      if (!context) return;
      client.setQueryData<LinhaListaOficial[]>(queryKey, (rows = []) => {
        if (change.kind === "add") return rows.filter((row) => row.key !== context.temporaryKey);
        const original = context.previous.find((row) => row.key === change.linha.key);
        return original ? sortStudents([...rows.filter((row) => row.key !== original.key), original]) : rows;
      });
    },
    onSuccess: (result, change, context) => {
      if (change.kind !== "add" || !result || !context) return;
      const id = String(result.student.id);
      client.setQueryData<LinhaListaOficial[]>(queryKey, (rows = []) => rows.map((row) => row.key === context.temporaryKey ? { ...row, id, key: `matriculas-${id}` } : row));
    },
    onSettled: () => {
      if (client.isMutating({ mutationKey }) === 1) void client.invalidateQueries({ queryKey });
    },
  });

  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (client.isMutating({ mutationKey: ["official-roster-change", userId] })) { refresh(); return; }
        void client.invalidateQueries({ queryKey: ["official-roster", userId] });
      }, 200);
    };
    const channel = supabase.channel(`official-roster-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "matriculas" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "confirmacoes" }, refresh).subscribe();
    return () => { clearTimeout(timer); void supabase.removeChannel(channel); client.removeQueries({ queryKey: ["official-roster", userId] }); };
  }, [client, userId]);

  return { linhas: userId ? query.data ?? [] : [], loading: authLoading || query.isLoading, refreshing: query.isFetching, error: query.error, busy: mutation.isPending,
    refresh: () => client.invalidateQueries({ queryKey }),
    add: (input: AddInput) => mutation.mutateAsync({ kind: "add", input }),
    update: (linha: LinhaListaOficial, data: EdicaoLinha) => mutation.mutateAsync({ kind: "update", linha, data }),
    remove: (linha: LinhaListaOficial) => mutation.mutateAsync({ kind: "delete", linha }),
  };
}
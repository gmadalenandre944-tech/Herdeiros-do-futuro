import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { encarregadoNav } from "@/lib/nav";
import { toast } from "sonner";
import { classeFromTurma, fetchAllStudentRecords, slugNome } from "@/lib/schoolData";
import { isUuid } from "@/lib/uuid";
import { normalizarMesPagamento } from "@/lib/paymentData";

const fmtKz = (v: number) => `${Number(v).toLocaleString("pt-AO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;

interface Aluno { id: string; nome_completo: string; numero_processo: string; classe: string; }
interface Nota { id: string; disciplina: string; trimestre: number; ano_letivo: number; media: number | null; aluno_id: string; }
interface Pag { id: string; aluno_id: string; valor_pago: number; multa: number; pago: boolean; mes: number; ano_referencia: number | null; }

const EncarregadoStudents = () => {
  const { user } = useAuth();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [pags, setPags] = useState<Pag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const { data: links, error: linksError } = await dbFrom("encarregado_alunos")
          .select("aluno_id")
          .eq("encarregado_id", user.id);
        if (linksError) throw linksError;
        const ids = [...new Set(((links ?? []) as any[]).map((row) => row.aluno_id).filter(isUuid))];
        if (!ids.length) {
          if (!cancelled) {
            setAlunos([]);
            setNotas([]);
            setPags([]);
          }
          return;
        }

        const [studentRows, pagamentosResult] = await Promise.all([
          fetchAllStudentRecords(),
          dbFrom("pagamentos").select("*").in("aluno_id", ids).order("ano_referencia", { ascending: false }).order("mes", { ascending: false }),
        ]);
        if (pagamentosResult.error) throw pagamentosResult.error;

        const schoolById = new Map<string, any>();
        const schoolByIdentity = new Map<string, any>();
        studentRows.forEach((row: any) => {
          if (row?.id != null) schoolById.set(String(row.id), row);
          const name = slugNome(String(row?.full_name ?? row?.nome_completo ?? row?.nome ?? ""));
          const birthDate = String(row?.birth_date ?? row?.data_nascimento ?? "").slice(0, 10);
          if (name && birthDate) schoolByIdentity.set(`${name}|${birthDate}`, row);
        });

        const alunoRows = (studentRows as any[]).filter((row) => ids.includes(String(row.id))).map((row) => {
          const academic = schoolById.get(String(row.id))
            ?? schoolByIdentity.get(`${slugNome(String(row.nome_completo ?? row.full_name ?? ""))}|${String(row.data_nascimento ?? row.birth_date ?? "").slice(0, 10)}`);
          return {
            id: String(row.id),
            nome_completo: String(row.nome_completo ?? row.full_name ?? row.nome ?? ""),
            numero_processo: String(row.numero_processo ?? row.processo ?? ""),
            classe: classeFromTurma(academic?.turma),
          };
        });
        const pagamentos = ((pagamentosResult.data ?? []) as any[]).map((row) => ({
          ...row,
          valor_pago: Number(row.valor_pago ?? 0),
          multa: Number(row.multa ?? 0),
          mes: normalizarMesPagamento(row.mes),
        })) as Pag[];
        const numericStudentIds = [...new Set(alunoRows.map((row) => Number(row.id)).filter(Number.isSafeInteger))];
        const notasResult = numericStudentIds.length
          ? await dbFrom("mini_pautas")
            .select("id, aluno_id, disciplina, trimestre, ano_letivo, media_final")
            .in("aluno_id", numericStudentIds)
            .order("trimestre")
          : { data: [], error: null };
        if (notasResult.error) throw notasResult.error;
        const notasRows = ((notasResult.data as any[]) ?? []).map((row) => ({
          id: String(row.id),
          aluno_id: String(row.aluno_id),
          disciplina: String(row.disciplina ?? ""),
          trimestre: Number(row.trimestre),
          ano_letivo: Number(row.ano_letivo),
          media: row.media_final == null ? null : Number(row.media_final),
        })) as Nota[];
        if (!cancelled) {
          setAlunos(alunoRows as Aluno[]);
          setPags(pagamentos);
          setNotas(notasRows);
        }
      } catch (error: any) {
        console.error("[EncarregadoStudents] falha ao carregar educandos:", error);
        if (!cancelled) toast.error(`Não foi possível carregar os educandos: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <RoleLayout title="Encarregado" subtitle="Herdeiros do Futuro" headerLabel="Meus Educandos" navItems={encarregadoNav}>
      <div className="space-y-6">
        <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Meus Educandos</h1>
        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : alunos.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6">
            <p className="text-muted-foreground text-sm">Sem educandos associados ao seu utilizador.</p>
          </div>
        ) : alunos.map((a) => {
          const aNotas = notas.filter((n) => n.aluno_id === a.id);
          const aPags = pags.filter((p) => p.aluno_id === a.id);
          const dividas = aPags.filter((p) => !p.pago);
          const totalDivida = dividas.reduce((s, p) => s + Number(p.valor_pago || 0) + Number(p.multa ?? 0), 0);
          return (
            <Card key={a.id}>
              <CardHeader>
                <CardTitle className="text-lg">{a.nome_completo} <span className="text-muted-foreground text-sm font-normal">— {a.classe}</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Notas</p>
                  {aNotas.length === 0 ? (
                    <p className="text-muted-foreground text-xs">Sem notas lançadas.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead><tr className="text-left text-muted-foreground"><th className="py-1">Disciplina</th><th>Trim.</th><th>Ano</th><th className="text-right">Média</th></tr></thead>
                      <tbody>
                        {aNotas.map((n) => (
                          <tr key={n.id} className="border-t border-border"><td className="py-1.5">{n.disciplina}</td><td>{n.trimestre}º</td><td>{n.ano_letivo}</td><td className={`text-right font-semibold ${(n.media ?? 0) < 10 ? "text-destructive" : ""}`}>{n.media !== null ? Number(n.media).toFixed(1) : "—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold mb-1">Situação Financeira</p>
                  {dividas.length === 0 ? (
                    <p className="text-green-600 text-xs">Em dia ✓</p>
                  ) : (
                    <p className="text-destructive text-xs">{dividas.length} pagamento(s) em atraso — Total: {fmtKz(totalDivida)}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </RoleLayout>
  );
};

export default EncarregadoStudents;

import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import BankDetailsCard from "@/components/BankDetailsCard";
import { LayoutDashboard, GraduationCap, CalendarCheck, BookOpen, Wallet, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { db as dbFrom } from "@/lib/db";
import { resolveAlunoDoUtilizador, type Aluno } from "@/lib/schoolData";
import { normalizarPagamento, periodoPagamento, type PaymentRecord } from "@/lib/paymentData";
import { toast } from "sonner";

const alunoNav = [
  { label: "Início", path: "/aluno", icon: LayoutDashboard },
  { label: "Notas", path: "/aluno/grades", icon: GraduationCap },
  { label: "Horários", path: "/aluno/schedules", icon: CalendarCheck },
  { label: "Materiais", path: "/aluno/materials", icon: BookOpen },
  { label: "Pagamentos", path: "/aluno/payments", icon: Wallet },
];

const AlunoPayments = () => {
  const { user } = useAuth();
  const userId = user?.id;
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [pagamentos, setPagamentos] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAluno(null);
    setPagamentos([]);
    const carregarHistorico = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { aluno: alunoLigado } = await resolveAlunoDoUtilizador(userId, "aluno");
        if (!alunoLigado) {
          if (!cancelled) setAluno(null);
          return;
        }
        const { data, error } = await dbFrom("pagamentos")
          .select("*")
          .eq("aluno_id", alunoLigado.id)
          .order("data_pagamento", { ascending: false });
        if (error) throw error;
        if (!cancelled) {
          setAluno(alunoLigado);
          setPagamentos(((data ?? []) as any[]).map(normalizarPagamento));
        }
      } catch (error: any) {
        console.error("[AlunoPayments] erro ao carregar histórico:", error);
        if (!cancelled) toast.error(`Não foi possível carregar o histórico: ${error?.message ?? "erro de ligação à base de dados."}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void carregarHistorico();
    return () => { cancelled = true; };
  }, [userId]);

  const totalPago = pagamentos.filter((pagamento) => pagamento.pago)
    .reduce((total, pagamento) => total + pagamento.valor_pago, 0);

  return (
    <RoleLayout title="Aluno" subtitle="Herdeiros do Futuro" headerLabel="Pagamentos" navItems={alunoNav}>
      <div className="space-y-6">
        <div>
          <h1 className="font-montserrat text-2xl font-bold text-foreground lg:text-3xl">Pagamentos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {aluno ? `Histórico de pagamentos de ${aluno.nome}.` : "Consulte os dados bancários e o histórico da sua conta."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <BankDetailsCard />
          <Card>
            <CardHeader><CardTitle className="text-lg">Como pagar</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>1. Efetue a transferência bancária ou pagamento Express com os dados ao lado.</p>
              <p>2. Solicite ao Encarregado para enviar o comprovativo no painel dele.</p>
              <p>3. Aguarde a validação da Secretaria.</p>
              <p className="font-medium text-destructive">Pagamentos após o dia 10 podem incluir multa.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Receipt className="h-5 w-5 text-primary" /> Histórico de pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">A carregar o histórico...</p>
            ) : !aluno ? (
              <p className="text-sm text-muted-foreground">
                Não foi possível associar este perfil a um aluno da base escolar. Contacte a Secretaria para confirmar o vínculo do seu número de processo.
              </p>
            ) : pagamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não existem pagamentos registados para este aluno.</p>
            ) : (
              <div className="space-y-4">
                {pagamentos.some((pagamento) => pagamento.ano_referencia == null) && (
                  <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900">
                    * Nos registos antigos sem ano de referência, o ano apresentado é estimado pela data de recebimento.
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/50 p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total de pagamentos registados como pagos</p>
                    <p className="text-xl font-bold">{totalPago.toLocaleString("pt-AO")} Kz</p>
                  </div>
                  <Badge variant="secondary">{pagamentos.length} registo(s)</Badge>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/50">
                        <th className="px-4 py-3 text-left font-semibold">Referência</th>
                        <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                        <th className="px-4 py-3 text-left font-semibold">Data</th>
                        <th className="px-4 py-3 text-right font-semibold">Valor</th>
                        <th className="px-4 py-3 text-center font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagamentos.map((pagamento) => (
                        <tr key={pagamento.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 font-medium">{periodoPagamento(pagamento)}</td>
                          <td className="px-4 py-3 capitalize">{pagamento.tipo}</td>
                          <td className="px-4 py-3">{pagamento.data_pagamento ? new Date(`${pagamento.data_pagamento.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-AO") : "—"}</td>
                          <td className="px-4 py-3 text-right font-mono">{pagamento.valor_pago.toLocaleString("pt-AO")} Kz</td>
                          <td className="px-4 py-3 text-center">
                            {pagamento.pago
                              ? <Badge className="bg-green-600 text-white">Pago</Badge>
                              : <Badge variant="destructive">Pendente</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
};

export default AlunoPayments;
import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { useAuth } from "@/hooks/useAuth";
import BankDetailsCard from "@/components/BankDetailsCard";
import ChatPanel from "@/components/ChatPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Wallet, MessageCircle, LayoutDashboard, Users } from "lucide-react";
import { toast } from "sonner";
import { normalizarPagamento } from "@/lib/paymentData";

const encarregadoNav = [
  { label: "Início", path: "/encarregado", icon: LayoutDashboard },
  { label: "Meus Educandos", path: "/encarregado/students", icon: Users },
  { label: "Pagamentos", path: "/encarregado/payments", icon: Wallet },
];

interface Pagamento {
  id: string;
  tipo: string;
  valor_pago: number;
  mes: number;
  ano_referencia: number | null;
  pago: boolean;
  multa: number;
  comprovativo_url: string | null;
  comprovativo_status: string | null;
  chat_channel_id: string | null;
}

const statusBadge = (p: Pagamento) => {
  if (p.pago) return <Badge className="bg-green-600 hover:bg-green-700">Pago</Badge>;
  if (p.comprovativo_status === "pendente") return <Badge variant="secondary">Aguarda validação</Badge>;
  if (p.comprovativo_status === "rejeitado") return <Badge variant="destructive">Rejeitado</Badge>;
  return <Badge variant="destructive">Pendente</Badge>;
};

const EncarregadoPayments = () => {
  const { user } = useAuth();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [chatChannelId, setChatChannelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    try {
      const { data: links, error: linksError } = await dbFrom("encarregado_alunos")
        .select("aluno_id")
        .eq("encarregado_id", user.id);
      if (linksError) throw linksError;
      const alunoIds = [...new Set<string>(
        ((links ?? []) as Array<{ aluno_id: string | null }> )
          .map((link) => link.aluno_id)
          .filter((id): id is string => Boolean(id)),
      )];
      if (!alunoIds.length) {
        setPagamentos([]);
        return;
      }
      const { data, error } = await supabase
        .from("pagamentos")
        .select("*")
        .in("aluno_id", alunoIds)
        .order("ano_referencia", { ascending: false })
        .order("mes", { ascending: false });
      if (error) throw error;
      setPagamentos(((data ?? []) as any[]).map((row) => ({
        ...normalizarPagamento(row),
        multa: Number(row.multa ?? 0),
        comprovativo_url: row.comprovativo_url ? String(row.comprovativo_url) : null,
        comprovativo_status: row.comprovativo_status ? String(row.comprovativo_status) : null,
        chat_channel_id: row.chat_channel_id ? String(row.chat_channel_id) : null,
      })));
    } catch (error: any) {
      console.error("[EncarregadoPayments] falha ao carregar pagamentos:", error);
      toast.error(`Não foi possível carregar os pagamentos: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  const ensurePaymentChannel = async () => {
    if (!user) return null;
    try {
      const { data: existing, error: existingError } = await supabase
        .from("chat_channels")
        .select("id, chat_members!inner(user_id)")
        .eq("type", "pagamento")
        .eq("chat_members.user_id", user.id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return existing.id;

      const { data: profile, error: profileError } = await supabase.from("profiles").select("nome").eq("id", user.id).maybeSingle();
      if (profileError) throw profileError;
      const { data: channel, error } = await supabase
        .from("chat_channels")
        .insert({
          name: `Pagamentos - ${profile?.nome || "Encarregado"}`,
          type: "pagamento",
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      if (!channel) throw new Error("O Supabase não devolveu o canal criado.");
      const { error: memberError } = await supabase.from("chat_members").insert({ channel_id: channel.id, user_id: user.id });
      if (memberError) {
        const { error: rollbackError } = await supabase.from("chat_channels").delete().eq("id", channel.id);
        if (rollbackError) {
          console.error("[EncarregadoPayments] falha ao limpar canal sem membro:", rollbackError);
          throw new Error(`${memberError.message}. Também não foi possível remover o canal incompleto: ${rollbackError.message}`);
        }
        throw memberError;
      }
      return channel.id;
    } catch (error: any) {
      console.error("[EncarregadoPayments] falha ao preparar canal:", error);
      toast.error(`Não foi possível preparar o canal de pagamentos: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      return null;
    }
  };

  useEffect(() => {
    fetchAll();
    ensurePaymentChannel().then(setChatChannelId);
  }, [user]);

  const uploadReceipt = async (pagamento: Pagamento, file: File) => {
    if (!user) return;
    setLoading(true);
    const path = `${user.id}/${pagamento.id}-${Date.now()}-${file.name}`;
    let uploaded = false;
    try {
      const { error: upErr } = await supabase.storage.from("payment-receipts").upload(path, file);
      if (upErr) throw upErr;
      uploaded = true;
      const { error } = await supabase
        .from("pagamentos")
        .update({ comprovativo_url: path, comprovativo_status: "pendente" })
        .eq("id", pagamento.id);
      if (error) throw error;
      toast.success("Comprovativo enviado! Aguarde validação da Secretaria.");
      await fetchAll();
    } catch (error: any) {
      console.error("[EncarregadoPayments] falha ao enviar comprovativo:", error);
      if (uploaded) {
        const { error: cleanupError } = await supabase.storage.from("payment-receipts").remove([path]);
        if (cleanupError) console.error("[EncarregadoPayments] não foi possível remover o ficheiro incompleto:", cleanupError);
      }
      toast.error(`Não foi possível enviar o comprovativo: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setLoading(false);
    }
  };

  const monthName = (m: number) =>
    ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][m - 1] || `Mês ${m}`;

  return (
    <RoleLayout title="Encarregado" subtitle="Herdeiros do Futuro" headerLabel="Pagamentos" navItems={encarregadoNav}>
      <div className="space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Pagamentos</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Consulte os dados bancários, envie comprovativos e converse com a Secretaria.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankDetailsCard />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="h-5 w-5 text-primary" /> Histórico de Propinas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pagamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem pagamentos registados.</p>
              ) : (
                <div className="space-y-2">
                  {pagamentos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                      <div>
                        <p className="font-semibold text-sm">
                          {monthName(p.mes)}/{p.ano_referencia ?? "—"} — {Number(p.valor_pago).toLocaleString("pt-AO")} Kz
                        </p>
                        {p.multa > 0 && <p className="text-xs text-destructive">Multa: {p.multa} Kz</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(p)}
                        {!p.pago && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*,.pdf"
                              className="hidden"
                              disabled={loading}
                              onChange={(e) => e.target.files?.[0] && uploadReceipt(p, e.target.files[0])}
                            />
                            <Button asChild size="sm" variant="outline" disabled={loading}>
                              <span>
                                <Upload className="h-3.5 w-3.5 mr-1" />
                                Comprovativo
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5 text-primary" />
              Chat com a Secretaria — Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chatChannelId ? (
              <ChatPanel channelId={chatChannelId} />
            ) : (
              <p className="text-sm text-muted-foreground">A preparar canal de conversa...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleLayout>
  );
};

export default EncarregadoPayments;

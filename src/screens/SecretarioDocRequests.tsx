import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inbox, CheckCircle, Clock } from "lucide-react";
import { secretarioNav } from "@/lib/nav";
import { supabase } from "@/integrations/supabase/client";
import { db as dbFrom } from "@/lib/db";
import { toast } from "sonner";

const SecretarioDocRequests = () => {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await dbFrom("documentos_solicitados").select("*").order("created_at", { ascending: false });
    setItems((data as any[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const updateEstado = async (id: string, estado: string) => {
    try {
      const { error } = await dbFrom("documentos_solicitados").update({ estado, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      toast.success("Estado actualizado");
      await load();
    } catch (error: any) {
      console.error("[SecretarioDocRequests] falha ao actualizar pedido:", error);
      toast.error(`Não foi possível actualizar o pedido: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  return (
    <RoleLayout title="Secretaria" subtitle="Pedidos" headerLabel="Pedidos de Documentos" navItems={secretarioNav}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Inbox className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-montserrat font-bold text-2xl">Pedidos de Documentos</h1>
            <p className="text-sm text-muted-foreground">{items.length} pedido(s) recebido(s)</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {items.length === 0 ? <p className="p-8 text-center text-muted-foreground">Nenhum pedido recebido.</p>
            : items.map((r) => (
              <div key={r.id} className="p-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{r.tipo}</p>
                    <Badge variant="outline" className="text-[10px]">{r.solicitante_role}</Badge>
                    <Badge variant={r.estado === "Concluído" ? "default" : "secondary"}>{r.estado}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {r.aluno_nome ?? r.solicitante_nome} • {new Date(r.created_at).toLocaleString("pt-AO")}
                  </p>
                  {r.observacao && <p className="text-sm mt-2">{r.observacao}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {r.estado === "Pendente" && (
                    <Button size="sm" variant="outline" onClick={() => updateEstado(r.id, "Em processamento")}>
                      <Clock className="h-4 w-4 mr-2" />Em processamento
                    </Button>
                  )}
                  {r.estado !== "Concluído" && (
                    <Button size="sm" onClick={() => updateEstado(r.id, "Concluído")}>
                      <CheckCircle className="h-4 w-4 mr-2" />Concluir
                    </Button>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>
    </RoleLayout>
  );
};

export default SecretarioDocRequests;

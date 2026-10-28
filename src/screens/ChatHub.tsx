import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import ChatPanel from "@/components/ChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageCircle, Users } from "lucide-react";
import { adminNav, secretarioNav, professorNav, alunoNav, encarregadoNav } from "@/lib/nav";

interface Channel {
  id: string;
  name: string;
  type: string;
}

const db = (t: string): any => (supabase as any).from(t);

const ChatHub = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  const fetchChannels = async () => {
    if (!user) return;
    try {
      const { data: geral, error: geralErr } = await db("chat_channels")
        .select("id")
        .eq("type", "geral")
        .limit(1)
        .maybeSingle();
      if (geralErr) throw geralErr;
      if (geral?.id) {
        const { error: memberError } = await db("chat_members")
          .upsert({ channel_id: geral.id, user_id: user.id }, { onConflict: "channel_id,user_id" });
        if (memberError) throw memberError;
      }
      const { data, error } = await db("chat_channels")
        .select("id, name, type, chat_members!inner(user_id)")
        .eq("chat_members.user_id", user.id)
        .order("type")
        .order("name");
      if (error) throw error;
      const list = (data ?? []).map((c: any) => ({ id: c.id, name: c.name, type: c.type }));
      setChannels(list);
      setActive((prev) => prev ?? (list.length > 0 ? list[0].id : null));
      setSetupError(null);
    } catch (error: any) {
      console.error("[ChatHub] falha ao carregar canais:", error);
      setSetupError(error?.message ?? "verifique a ligação e as permissões do Supabase.");
    }
  };

  useEffect(() => {
    void fetchChannels();
  }, [user]);

  const navMap: any = {
    admin: adminNav,
    secretario: secretarioNav,
    professor: professorNav,
    aluno: alunoNav,
    encarregado: encarregadoNav,
  };
  const nav = navMap[role || ""] ?? [];
  const titleMap: any = {
    admin: "Herdeiros",
    secretario: "Secretaria",
    professor: "Professor",
    aluno: "Aluno",
    encarregado: "Encarregado",
  };

  return (
    <RoleLayout
      title={titleMap[role || ""] || "Herdeiros"}
      subtitle="do Futuro"
      headerLabel="Mensagens"
      navItems={nav}
    >
      <div className="space-y-4">
        <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground flex items-center gap-2">
          <MessageCircle className="h-7 w-7 text-primary" /> Chat & Canais
        </h1>

        {setupError && (
          <Card className="border-destructive/40">
            <CardContent className="p-4 text-sm text-muted-foreground">
              O chat ainda não está activo na base de dados ({setupError}). Execute o ficheiro{" "}
              <strong>BASE_DADOS_FIX.sql</strong> no SQL Editor do Supabase para criar os canais,
              membros e mensagens.
            </CardContent>
          </Card>
        )}



        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Card className="lg:col-span-1">
            <CardContent className="p-3 space-y-1">
              {channels.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">Sem canais ainda.</p>
              ) : (
                channels.map((c) => (
                  <Button
                    key={c.id}
                    variant={active === c.id ? "default" : "ghost"}
                    className="w-full justify-start text-left"
                    onClick={() => setActive(c.id)}
                  >
                    <Users className="h-4 w-4 mr-2 shrink-0" />
                    <div className="flex flex-col items-start overflow-hidden">
                      <span className="text-sm truncate w-full">{c.name}</span>
                      <span className="text-[10px] opacity-60 capitalize">{c.type}</span>
                    </div>
                  </Button>
                ))
              )}
            </CardContent>
          </Card>

          <div className="lg:col-span-3">
            {active ? (
              <ChatPanel channelId={active} height="h-[600px]" />
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  Selecione um canal para começar a conversar.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </RoleLayout>
  );
};

export default ChatHub;

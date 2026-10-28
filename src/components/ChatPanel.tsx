import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, FileText } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  author_name?: string;
}

interface ChatPanelProps {
  channelId: string;
  height?: string;
}

const ChatPanel = ({ channelId, height = "h-[420px]" }: ChatPanelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      const userIds = [...new Set((data ?? []).map((m) => m.user_id))];
      const { data: profs, error: profileError } = userIds.length
        ? await supabase.from("profiles").select("id,nome").in("id", userIds)
        : { data: [], error: null };
      if (profileError) throw profileError;
      const map = new Map(profs?.map((p) => [p.id, p.nome]) ?? []);
      setMessages((data ?? []).map((m) => ({ ...m, author_name: map.get(m.user_id) ?? "Utilizador" })));
    } catch (error: any) {
      console.error("[ChatPanel] falha ao carregar mensagens:", error);
      toast.error(`Não foi possível carregar as mensagens: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    }
  };

  useEffect(() => {
    if (!channelId) return;
    fetchMessages();
    const ch = supabase
      .channel(`chat-${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        async (payload) => {
          try {
            const msg: any = payload.new;
            const { data: prof, error } = await supabase.from("profiles").select("nome").eq("id", msg.user_id).maybeSingle();
            if (error) throw error;
            setMessages((prev) => prev.some((item) => item.id === msg.id)
              ? prev
              : [...prev, { ...msg, author_name: prof?.nome ?? "Utilizador" }]);
          } catch (error) {
            console.error("[ChatPanel] falha ao receber mensagem em tempo real:", error);
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [channelId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (content: string, attUrl?: string, attName?: string) => {
    if (!user) {
      toast.error("A sessão expirou. Entre novamente para enviar a mensagem.");
      return false;
    }
    try {
      const { error } = await supabase.from("chat_messages").insert({
        channel_id: channelId,
        user_id: user.id,
        content: content || null,
        attachment_url: attUrl || null,
        attachment_name: attName || null,
      });
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("[ChatPanel] falha ao enviar mensagem:", error);
      toast.error(`Não foi possível enviar a mensagem: ${error?.message ?? "verifique a ligação ao Supabase."}`);
      return false;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;
    setSending(true);
    try {
      if (await sendMessage(input.trim())) setInput("");
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setSending(true);
    const path = `${user.id}/${Date.now()}-${file.name}`;
    let uploaded = false;
    try {
      const { error: uploadError } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (uploadError) throw uploadError;
      uploaded = true;
      const { data: signed, error: signedError } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60 * 60 * 24 * 30);
      if (signedError) throw signedError;
      if (!signed?.signedUrl) throw new Error("O Supabase não devolveu o endereço do anexo.");
      const sent = await sendMessage("", signed.signedUrl, file.name);
      if (!sent) {
        await supabase.storage.from("chat-attachments").remove([path]);
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
    } catch (error: any) {
      console.error("[ChatPanel] falha ao enviar anexo:", error);
      if (uploaded) {
        const { error: cleanupError } = await supabase.storage.from("chat-attachments").remove([path]);
        if (cleanupError) console.error("[ChatPanel] falha ao remover anexo incompleto:", cleanupError);
      }
      toast.error(`Não foi possível enviar o anexo: ${error?.message ?? "verifique o armazenamento do Supabase."}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`flex flex-col ${height} border border-border rounded-xl bg-card`}>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Sem mensagens ainda. Comece a conversa!</p>
          )}
          {messages.map((m) => {
            const mine = m.user_id === user?.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {!mine && <p className="text-[10px] font-semibold opacity-70 mb-1">{m.author_name}</p>}
                  {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                  {m.attachment_url && (
                    <a
                      href={m.attachment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-xs underline mt-1"
                    >
                      <FileText className="h-3 w-3" />
                      {m.attachment_name || "Anexo"}
                    </a>
                  )}
                  <p className="text-[9px] opacity-60 mt-1">
                    {new Date(m.created_at).toLocaleTimeString("pt-AO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <form onSubmit={handleSend} className="border-t border-border p-3 flex gap-2 items-center">
        <input ref={fileRef} type="file" onChange={handleFile} className="hidden" accept="image/*,.pdf" />
        <Button type="button" size="icon" variant="ghost" onClick={() => fileRef.current?.click()} disabled={sending}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          placeholder="Escreva uma mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default ChatPanel;

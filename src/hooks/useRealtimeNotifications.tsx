import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { Bell } from "lucide-react";
import { createElement } from "react";

/**
 * Subscribes to new announcements & chat messages via Supabase Realtime
 * and triggers toast notifications when relevant for the current user.
 */
export const useRealtimeNotifications = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const mounted = useRef(false);

  useEffect(() => {
    if (!user || !role) return;
    // Skip initial mount events to avoid spamming on first load
    mounted.current = true;

    const annChannel = supabase
      .channel("notify-announcements")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "announcements" },
        (payload) => {
          const a: any = payload.new;
          const audience: string[] = a.target_audience || [];
          if (audience.includes("todos") || audience.includes(role)) {
            toast.success(a.titulo, {
              description: a.conteudo?.slice(0, 80),
              icon: createElement(Bell, { className: "h-4 w-4" }),
            });
          }
        }
      )
      .subscribe();

    const msgChannel = supabase
      .channel("notify-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const m: any = payload.new;
          if (m.user_id === user.id) return;
          // Confirm membership before notifying (RLS already filters but be safe)
          const { data } = await supabase
            .from("chat_members")
            .select("id")
            .eq("channel_id", m.channel_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (data) {
            toast("Nova mensagem no chat", {
              description: m.content?.slice(0, 80) || "Anexo recebido",
            });
          }
        }
      )
      .subscribe();

    const personalChannel = supabase
      .channel("notify-personal")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n: any = payload.new;
          const fn = n.type === "error" ? toast.error : n.type === "success" ? toast.success : toast;
          fn(n.title, {
            description: n.message,
            icon: createElement(Bell, { className: "h-4 w-4" }),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(annChannel);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(personalChannel);
    };
  }, [user, role]);
};

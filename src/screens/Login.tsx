import { useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IconInput, PasswordInput } from "@/components/ui/icon-input";

import { toast } from "sonner";
import { LogIn, Mail, Lock } from "lucide-react";
import type { AppRole } from "@/hooks/useUserRole";
import schoolLogo from "@/assets/Logotipo do Herdeiros do futuro.jpeg";
import authBackground from "@/assets/auth-school-background.jpeg";

const roleHomePaths: Record<AppRole, string> = {
  admin: "/admin",
  professor: "/professor",
  aluno: "/aluno",
  encarregado: "/encarregado",
  secretario: "/secretaria",
};

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      const code = (error as any).code || "";
      const msg = error.message || "";
      if (code === "email_not_confirmed" || /not confirmed/i.test(msg)) {
        toast.error("Email não confirmado", {
          description: "Verifique a sua caixa de entrada e clique no link de confirmação, ou peça ao Administrador para confirmar a sua conta.",
        });
      } else if (code === "email_provider_disabled" || /email logins are disabled/i.test(msg)) {
        toast.error("O login por e-mail está desligado no servidor", { description: "A administração precisa de voltar a activá-lo." });
      } else if (code === "invalid_credentials" || /invalid login credentials/i.test(msg)) {
        toast.error("Credenciais inválidas", { description: "Email ou senha incorretos." });
      } else {
        toast.error("Erro ao entrar", { description: msg || "Tente novamente." });
      }
      return;
    }

    // Contas antigas guardaram a foto dentro da sessão; a sessão fica tão grande
    // que a base de dados recusa todos os pedidos ("erro de internet").
    if ((data.session?.access_token?.length ?? 0) > 8000) {
      toast.error("Esta conta precisa de ser corrigida", {
        description: "A foto de perfil antiga está guardada dentro da sessão e bloqueia a ligação. O administrador deve executar a correção da base de dados; depois entre de novo.",
        duration: 15000,
      });
      console.error("[Login] sessão demasiado grande:", data.session?.access_token?.length, "caracteres");
    }

    // Check if staff is pending approval
    const { data: staffData } = await supabase
      .from("staff_profiles")
      .select("status, role")
      .eq("user_id", data.user.id)
      .maybeSingle();

    // Apenas contas explicitamente rejeitadas são bloqueadas; contas novas entram logo.
    if (staffData && staffData.status === "rejected") {
      await supabase.auth.signOut();
      setLoading(false);
      toast.error("A sua conta foi rejeitada pelo Administrador.");
      return;
    }

    let roleData: { role: string } | null = null;
    let roleError: any = null;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      const r = await supabase.from("user_roles").select("role").eq("user_id", data.user.id).limit(1).maybeSingle();
      roleData = r.data as any; roleError = r.error;
      if (!roleError) break;
      await new Promise((res) => setTimeout(res, 500));
    }
    if (roleError) {
      const metaRole = (data.user.user_metadata as any)?.role as AppRole | undefined;
      if (metaRole) roleData = { role: metaRole };
      else {
        setLoading(false);
        toast.error("Falha de ligação", { description: "Não foi possível confirmar o seu perfil. Verifique a internet e tente de novo." });
        return;
      }
    }

    const staffRole = (staffData as any)?.role as AppRole | undefined;
    if (staffRole && ["admin","professor","secretario"].includes(staffRole) && (!roleData?.role || roleData.role === "aluno")) {
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: staffRole });
      roleData = { role: staffRole };
    }

    // Fallback: if no role assigned, default to 'aluno' so the user is never blocked
    if (!roleData?.role) {
      const metaRole = (data.user.user_metadata as any)?.role as AppRole | undefined;
      const fallback: AppRole = metaRole && ["admin","professor","aluno","encarregado","secretario"].includes(metaRole)
        ? metaRole
        : "aluno";
      const { error: insertErr } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user.id, role: fallback });
      if (insertErr) console.warn("[Login] função não gravada, a usar a da conta:", insertErr.message);
      roleData = { role: fallback };
    }

    // Surface unread approval notifications
    const { data: notifs, error: notificationsError } = await supabase
      .from("notifications")
      .select("id, title, message")
      .eq("user_id", data.user.id)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(3);
    if (notificationsError) {
      console.error("[Login] falha ao carregar notificações:", notificationsError);
      toast.error(`Não foi possível carregar as notificações: ${notificationsError.message}`);
    }
    notifs?.forEach((n) => toast.success(n.title, { description: n.message }));
    if (notifs?.length) {
      const { error: markReadError } = await supabase.from("notifications").update({ read: true }).in("id", notifs.map((n) => n.id));
      if (markReadError) {
        console.error("[Login] falha ao marcar notificações como lidas:", markReadError);
        toast.error(`As notificações foram mostradas, mas não foi possível marcá-las como lidas: ${markReadError.message}`);
      }
    }

    setLoading(false);
    const role = (roleData?.role as AppRole) || "aluno";
    toast.success("Bem-vindo!");
    navigate(roleHomePaths[role]);
  };


  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${authBackground}")` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#f7f0e7]/88 backdrop-blur-[2px]" />

      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-md animate-rise-in">
          <div className="mb-7 text-center">
            <img
              src={schoolLogo}
              alt="Logotipo Herdeiros do Futuro"
              className="mx-auto mb-5 h-20 w-20 rounded-[1.15rem] object-contain shadow-md ring-1 ring-border"
            />
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Área reservada</p>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Bem-vindo de volta.</h1>
            <p className="mt-2 text-sm text-muted-foreground">Entre para continuar a acompanhar a sua comunidade escolar.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 rounded-3xl border border-border bg-card/95 p-6 shadow-[0_18px_55px_hsl(158_35%_14%/0.12)] backdrop-blur sm:p-8">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <IconInput data-testid="input-login-email" icon={Mail} id="email" type="email" placeholder="nome@herdeirosdofuturo.co.ao" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput data-testid="input-login-password" icon={Lock} id="password" placeholder="A sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button data-testid="button-login-submit" type="submit" className="w-full py-5 font-semibold shadow-sm transition-transform hover:-translate-y-0.5" disabled={loading}>
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link data-testid="link-login-signup" to="/" className="font-semibold text-accent hover:underline">Criar conta</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;

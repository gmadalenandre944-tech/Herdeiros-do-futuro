import { useEffect, useState } from "react";
import RoleLayout from "@/components/RoleLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldPlus, Trash2, Loader2, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { adminNav } from "@/lib/nav";

interface AdminRow {
  id: string;
  nome: string;
  email: string;
  created_at: string;
}

const Administradores = () => {
  const [form, setForm] = useState<{ nome: string; email: string; senha: string; papel: "admin" | "professor" | "secretario" }>({ nome: "", email: "", senha: "", papel: "professor" });
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", email: "" });
  const [updating, setUpdating] = useState(false);

  const startEdit = (a: AdminRow) => {
    setEditingId(a.id);
    setEditForm({ nome: a.nome ?? "", email: a.email ?? "" });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.nome.trim()) return toast.error("O nome não pode ficar vazio.");
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ nome: editForm.nome.trim(), email: editForm.email.trim() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Administrador atualizado.");
      setEditingId(null);
      await fetchAdmins();
    } catch (error: any) {
      console.error("[Administradores] falha ao actualizar administrador:", error);
      toast.error(`Não foi possível actualizar o administrador: ${error?.message ?? "verifique a ligação ao Supabase."}`);
    } finally {
      setUpdating(false);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    const { data: roles, error: rolesErr } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesErr) {
      toast.error("Erro a carregar administradores: " + rolesErr.message);
      setLoading(false);
      return;
    }

    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) {
      setAdmins([]);
      setLoading(false);
      return;
    }

    const { data: profs, error: profErr } = await supabase
      .from("profiles")
      .select("id, nome, email, created_at")
      .in("id", ids)
      .order("created_at", { ascending: false });

    if (profErr) {
      toast.error("Erro a carregar perfis: " + profErr.message);
    } else {
      setAdmins((profs ?? []) as AdminRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.senha.length < 6) {
      return toast.error("A senha deve ter pelo menos 6 caracteres.");
    }
    setSaving(true);

    try {
      // Guardamos a sessão atual do administrador para restaurar se necessário
      const currentSession = (await supabase.auth.getSession()).data.session;

      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.senha,
        options: {
          data: { nome: form.nome.trim(), role: form.papel },
        },
      });

      if (signUpErr) throw signUpErr;
      const newUserId = signUpData.user?.id;
      if (!newUserId) throw new Error("Não foi possível obter o ID do novo utilizador.");

      // Se o signUp alterou a sessão para o novo utilizador, restauramos a sessão do admin principal
      if (currentSession && currentSession.user.id !== newUserId) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      const { error: profileErr } = await supabase
        .from("profiles")
        .upsert(
          { id: newUserId, nome: form.nome.trim(), email: form.email.trim() } as any,
          { onConflict: "id" }
        );
      if (profileErr) throw profileErr;

      const { error: roleErr } = await supabase
        .from("user_roles")
        .upsert(
          { user_id: newUserId, role: form.papel } as any,
          { onConflict: "user_id,role" }
        );
      if (roleErr) throw roleErr;

      if (form.papel !== "admin") {
        // Professores/secretários criados pelo admin ficam logo aprovados.
        await (supabase as any)
          .from("staff_profiles")
          .upsert({ user_id: newUserId, nome: form.nome.trim(), email: form.email.trim(), role: form.papel, status: "approved" }, { onConflict: "user_id" });
      }

      const rotulo = form.papel === "admin" ? "Administrador" : form.papel === "professor" ? "Professor" : "Secretário";
      toast.success(`${rotulo} ${form.nome} criado com sucesso!`);
      setForm({ nome: "", email: "", senha: "", papel: form.papel });
      fetchAdmins();
    } catch (err: any) {
      toast.error("Erro ao criar administrador: " + (err?.message ?? "desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin: AdminRow) => {
    if (!confirm(`Eliminar definitivamente o administrador ${admin.nome}?`)) return;
    setDeletingId(admin.id);
    try {
      const { data, error } = await supabase.functions.invoke("delete-admin", {
        body: { user_id: admin.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Administrador eliminado.");
      fetchAdmins();
    } catch (err: any) {
      toast.error("Erro ao eliminar: " + (err?.message ?? "desconhecido"));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <RoleLayout title="Herdeiros" subtitle="do Futuro" headerLabel="Administradores" navItems={adminNav}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Administradores</h1>
          <p className="text-muted-foreground mt-1">Gerir contas com acesso total ao sistema</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Adicionar utilizador (professor, secretário ou administrador)</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de conta</Label>
              <select
                value={form.papel}
                onChange={(e) => setForm({ ...form, papel: e.target.value as any })}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="professor">Professor</option>
                <option value="secretario">Secretário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} required minLength={6} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldPlus className="h-4 w-4 mr-2" />}
              {saving ? "A criar..." : form.papel === "professor" ? "Adicionar Professor" : form.papel === "secretario" ? "Adicionar Secretário" : "Adicionar Administrador"}
            </Button>
          </form>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4">Administradores atuais</h2>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">A carregar...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum administrador registado.</div>
          ) : (
            <div className="space-y-2">
              {admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-border hover:bg-secondary/40 transition">
                  {editingId === a.id ? (
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Nome" maxLength={120} />
                      <Input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" maxLength={200} />
                    </div>
                  ) : (
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{a.nome || "(sem nome)"}</span>
                        <Badge variant="secondary">admin</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{a.email}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 shrink-0">
                    {editingId === a.id ? (
                      <>
                        <Button size="sm" onClick={() => saveEdit(a.id)} disabled={updating}>
                          {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={updating}>
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(a)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(a)}
                          disabled={deletingId === a.id}
                        >
                          {deletingId === a.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleLayout>
  );
};

export default Administradores;
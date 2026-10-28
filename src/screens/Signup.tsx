import { useState } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconInput, PasswordInput } from "@/components/ui/icon-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import HFLogo from "@/components/HFLogo";
import { toast } from "sonner";
import { UserPlus, Clock, User, Mail, Lock, Phone, IdCard, FileText, GraduationCap, Briefcase } from "lucide-react";
import authBackground from "@/assets/auth-school-background.jpeg";
import { compressImageToDataURL } from "@/lib/image";

type Role = "professor" | "aluno" | "encarregado" | "secretario";

const roleLabels: Record<Role, { label: string; description: string }> = {
  aluno: { label: "Aluno (6ª–9ª)", description: "Consulta de notas e frequência" },
  encarregado: { label: "Encarregado de Educação", description: "Acompanhamento do educando" },
  professor: { label: "Professor", description: "Acesso imediato ao painel docente" },
  secretario: { label: "Secretário(a)", description: "Acesso imediato à gestão administrativa" },
};

const SUBJECTS = [
  "Matemática", "Português", "Inglês", "Francês", "Física", "Química", "Biologia",
  "História", "Geografia", "Filosofia", "Educação Física", "Informática", "Economia",
  "Estudo do Meio", "Educação Musical", "Ciências da Natureza", "EMC",
  "Educação Plástica", "Educação Laboral", "EVP",
];
// Iniciação à 9ª — o colégio NÃO lecciona 10ª-13ª
const GRADE_LEVELS = ["Iniciação", "1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª", "8ª", "9ª"];
const STUDENT_SIGNUP_CLASSES = ["6ª Classe", "7ª Classe", "8ª Classe", "9ª Classe"];
const ID_TYPES = ["Bilhete de Identidade", "Cédula Pessoal", "Passaporte", "Cartão de Residente"];
const PARENTESCO = ["Pai", "Mãe", "Tio(a)", "Avô / Avó", "Irmão(ã)", "Tutor(a) Legal", "Outro"];
const ANOS_LECTIVOS = ["2024/2025", "2025/2026", "2026/2027"];

const Signup = () => {
  // Comuns
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState(false);
  const [role, setRole] = useState<Role>("aluno");

  // Foto de perfil (obrigatória) — guardada como base64
  const [fotoPerfil, setFotoPerfil] = useState("");
  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Selecione um ficheiro de imagem válido");
    if (file.size > 8 * 1024 * 1024) return toast.error("Imagem demasiado grande (máx. 8MB antes de otimizar)");
    try {
      const optimized = await compressImageToDataURL(file, 512, 700 * 1024);
      setFotoPerfil(optimized);
      toast.success("Foto otimizada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao processar imagem");
    }
  };

  // Aluno / Encarregado IPIL fields
  const [dataNascimento, setDataNascimento] = useState("");
  const [tipoId, setTipoId] = useState("");
  const [numeroId, setNumeroId] = useState("");
  const [numeroProcesso, setNumeroProcesso] = useState("");
  const [anoUltimaClasse, setAnoUltimaClasse] = useState("");
  const [ultimaTurma, setUltimaTurma] = useState("");
  const [grauParentesco, setGrauParentesco] = useState("");

  // Aluno classe (auto-registo)
  const [alunoClasse, setAlunoClasse] = useState<string>("");

  // Staff
  const [especialidade, setEspecialidade] = useState("");
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const navigate = useNavigate();

  const isStaff = role === "professor" || role === "secretario";
  const isAluno = role === "aluno";
  const isEncarregado = role === "encarregado";

  const toggle = (arr: string[], setArr: (v: string[]) => void, val: string) =>
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("A senha deve ter pelo menos 6 caracteres");
    if (!fotoPerfil) return toast.error("A foto de perfil é obrigatória");


    if (isAluno) {
      if (!STUDENT_SIGNUP_CLASSES.includes(alunoClasse)) {
        return toast.error("Apenas alunos da 6ª à 9ª classe podem criar conta. Os mais novos são registados pela Secretaria.");
      }
      if (!dataNascimento || !tipoId || !numeroId || !numeroProcesso) {
        return toast.error("Preencha todos os campos obrigatórios do aluno");
      }
    }
    if (isEncarregado) {
      if (!dataNascimento || !tipoId || !numeroId || !grauParentesco || !numeroProcesso) {
        return toast.error("Preencha todos os campos obrigatórios do encarregado");
      }
    }
    if (role === "professor") {
      if (disciplinas.length === 0) return toast.error("Selecione pelo menos uma disciplina");
      if (classes.length === 0) return toast.error("Selecione pelo menos uma classe");
    }

    setLoading(true);
    const { data: signUpData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // A foto NÃO vai para os dados da conta: entra em cada pedido e bloqueia a ligação.
          nome, role, telefone,
          whatsapp,
          ...((isAluno || isEncarregado) && {
            data_nascimento: dataNascimento,
            tipo_identificacao: tipoId,
            numero_identificacao: numeroId,
            numero_processo: numeroProcesso,
          }),
          ...(isAluno && {
            classe: alunoClasse,
            ano_ultima_classe: anoUltimaClasse,
            ultima_turma: ultimaTurma,
          }),
          ...(isEncarregado && { grau_parentesco: grauParentesco }),
          ...(isStaff && { especialidade }),
          ...(role === "professor" && { disciplinas, classes }),
        },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);

    if (error) {
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
        return toast.error("Este e-mail já está registado. Utilize outro ou faça login.");
      }
      if (msg.includes("request body") || msg.includes("payload") || msg.includes("too large")) {
        return toast.error("Dados demasiado grandes. Escolha uma foto mais pequena e tente novamente.");
      }
      if (msg.includes("failed to fetch") || msg.includes("network")) {
        return toast.error("Sem ligação ao servidor. Verifique a sua Internet e tente novamente.");
      }
      if (msg.includes("weak") || msg.includes("easy to guess")) {
        return toast.error("Senha demasiado fraca (ex.: 123456). Escolha uma senha mais difícil.");
      }
      if (msg.includes("email logins are disabled") || msg.includes("signups not allowed")) {
        return toast.error("Os registos por e-mail estão desligados no servidor. Peça à administração para os activar.");
      }
      return toast.error(error.message);
    }

    // Grava a conta de professor/secretário nas tabelas da escola (quando há sessão aberta).
    if (isStaff && signUpData.user && signUpData.session) {
      const uid = signUpData.user.id;
      const base = { user_id: uid, nome, email, telefone, especialidade };
      const extras = role === "professor" ? { disciplinas, classes } : {};
      const results = await Promise.all([
        role === "professor"
          ? supabase.from("professores" as any).upsert({ ...base, ...extras } as any, { onConflict: "user_id" })
          : Promise.resolve({ error: null }),
        supabase.from("staff_profiles" as any).upsert({ ...base, ...extras, role, status: "activo" } as any, { onConflict: "user_id" }),
        supabase.from("user_roles" as any).upsert({ user_id: uid, role } as any, { onConflict: "user_id,role" }),
      ]);
      results.forEach((r: any) => r?.error && console.error("[Signup] falha ao gravar conta de funcionário:", r.error));
    }

    // Entrada directa: com a confirmação de e-mail desligada, a sessão já vem aberta.
    const home: Record<Role, string> = { professor: "/professor", aluno: "/aluno", encarregado: "/encarregado", secretario: "/secretaria" };
    if (signUpData.session) {
      toast.success("Conta criada! Bem-vindo(a) ao sistema.");
      navigate(home[role]);
    } else {
      toast.success("Conta criada! Inicie sessão para continuar.");
      navigate("/login");
    }
  };

  if (submitted) {
    return (
      <div className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-background px-4 py-8">
        <div aria-hidden="true" className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-[0_18px_55px_hsl(158_35%_14%/0.08)] animate-rise-in">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-foreground">Cadastro submetido</h2>
          <p className="text-sm text-muted-foreground">
            Aguarde a aprovação do Administrador para iniciar sessão. Receberá uma notificação quando a conta for activada.
          </p>
          <Button data-testid="button-submitted-login" onClick={() => navigate("/login")} className="w-full rounded-xl">Voltar ao login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url("${authBackground}")` }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-[#f7f0e7]/88 backdrop-blur-[2px]" />

      <div className="relative z-10 flex min-h-[100dvh] items-start justify-center px-4 py-8 sm:px-6 sm:py-10">
        <div className="w-full max-w-3xl animate-rise-in">
        <div className="mb-6 text-center">
          <HFLogo size="lg" className="mx-auto" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-accent">Future Roots</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Crie o seu acesso ao portal</h1>
          <p className="mt-1 text-sm text-muted-foreground">Registe os seus dados para acompanhar a vida escolar.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5 rounded-3xl border border-border bg-card/95 p-6 shadow-[0_18px_55px_hsl(158_35%_14%/0.12)] backdrop-blur sm:p-8">
          {/* Selecção de perfil */}
          <div className="space-y-3">
            <Label>Perfil</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as Role)} className="grid sm:grid-cols-2 gap-2">
              {(Object.keys(roleLabels) as Role[]).map((r) => (
                <div key={r} className="flex items-center space-x-3 rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="flex-1 cursor-pointer">
                    <span className="font-medium text-foreground text-sm">{roleLabels[r].label}</span>
                    <span className="block text-xs text-muted-foreground">{roleLabels[r].description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Foto de perfil (obrigatória) */}
          <div className="space-y-2">
            <Label htmlFor="foto">Foto de perfil *</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 shrink-0 rounded-full border border-border overflow-hidden bg-secondary flex items-center justify-center">
                {fotoPerfil ? (
                  <img src={fotoPerfil} alt="Pré-visualização da foto de perfil" className="h-full w-full object-cover" />
                ) : (
                  <UserPlus className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <Input id="foto" type="file" accept="image/*" onChange={handleFotoChange} required />
                <p className="text-xs text-muted-foreground">Formato de imagem, máximo 2MB.</p>
              </div>
            </div>
          </div>

          {/* Comuns */}
          <div className="grid sm:grid-cols-2 gap-4">

            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo *</Label>
              <IconInput icon={User} id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            {(isAluno || isEncarregado) && (
              <div className="space-y-2">
                <Label htmlFor="dn">Data de nascimento *</Label>
                <Input id="dn" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} required />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email {isAluno || isEncarregado ? "(opcional)" : "*"}</Label>
              <IconInput icon={Mail} id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <PasswordInput icon={Lock} id="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </div>
          </div>

          {/* Aluno / Encarregado: Identificação */}
          {(isAluno || isEncarregado) && (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/40 border border-border">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de identificação *</Label>
                  <Select value={tipoId} onValueChange={setTipoId}>
                    <SelectTrigger><SelectValue placeholder="Seleccione um tipo de identificação" /></SelectTrigger>
                    <SelectContent>{ID_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nid">Nº de identificação *</Label>
                  <IconInput icon={IdCard} id="nid" value={numeroId} onChange={(e) => setNumeroId(e.target.value)} required />
                </div>
              </div>

              {isAluno && (
                <>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ano da última classe frequentada</Label>
                      <Select value={anoUltimaClasse} onValueChange={setAnoUltimaClasse}>
                        <SelectTrigger><SelectValue placeholder="Seleccione um ano lectivo" /></SelectTrigger>
                        <SelectContent>{ANOS_LECTIVOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Última turma frequentada</Label>
                      <IconInput icon={GraduationCap} value={ultimaTurma} onChange={(e) => setUltimaTurma(e.target.value)} placeholder="Ex.: 7ªA" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Classe a frequentar *</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {STUDENT_SIGNUP_CLASSES.map((g) => (
                        <button
                          type="button"
                          key={g}
                          data-testid={`button-select-class-${g.replace(/\s/g, "-").toLowerCase()}`}
                          onClick={() => setAlunoClasse(g)}
                          className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                            alunoClasse === g
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:bg-secondary"
                          }`}
                        >{g}</button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Iniciação à 5ª classe são registados pela Secretaria e acompanhados pelo Encarregado.
                    </p>
                  </div>
                </>
              )}

              {isEncarregado && (
                <div className="space-y-2">
                  <Label>Grau de parentesco *</Label>
                  <Select value={grauParentesco} onValueChange={setGrauParentesco}>
                    <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                    <SelectContent>{PARENTESCO.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="np">
                  Nº de processo {isEncarregado ? "do educando *" : "*"}
                </Label>
                <IconInput
                  icon={FileText}
                  id="np"
                  value={numeroProcesso}
                  onChange={(e) => setNumeroProcesso(e.target.value)}
                  placeholder="Introduza manualmente"
                  required
                />
              </div>
            </div>
          )}

          {/* Telefone + WhatsApp (todos) */}
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="tel">Telefone {isStaff ? "" : "*"}</Label>
              <IconInput icon={Phone} id="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="Ex.: 9XXXXXXXX" required={!isStaff} />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <Checkbox checked={whatsapp} onCheckedChange={(v) => setWhatsapp(!!v)} />
              <span>O número usa WhatsApp</span>
            </label>
          </div>

          {/* Staff fields (sem ID Funcionário) */}
          {isStaff && (
            <div className="space-y-4 p-4 rounded-lg bg-secondary/40 border border-border">
              <div className="space-y-2">
                <Label htmlFor="esp">Especialidade *</Label>
                <IconInput icon={Briefcase} id="esp" value={especialidade} onChange={(e) => setEspecialidade(e.target.value)} placeholder={role === "professor" ? "Ex.: Licenciado em Matemática" : "Área de actuação"} required />
              </div>

              {role === "professor" && (
                <>
                  <div className="space-y-2">
                    <Label>Disciplinas que lecciona *</Label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-md bg-background border border-border">
                      {SUBJECTS.map((s) => (
                        <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox checked={disciplinas.includes(s)} onCheckedChange={() => toggle(disciplinas, setDisciplinas, s)} />
                          {s}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Classes (Iniciação à 9ª) *</Label>
                    <div className="grid grid-cols-5 gap-2 p-2 rounded-md bg-background border border-border">
                      {GRADE_LEVELS.map((g) => (
                        <label key={g} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox checked={classes.includes(g)} onCheckedChange={() => toggle(classes, setClasses, g)} />
                          {g}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

                 <p className="rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                 Após o registo, entra logo no seu painel.
              </p>
            </div>
          )}

          <Button data-testid="button-signup-submit" type="submit" className="w-full rounded-xl py-5 font-semibold" disabled={loading}>
            <UserPlus className="h-4 w-4 mr-2" />
            {loading ? "A registar..." : "Registar"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
             Já tem conta? <Link data-testid="link-signup-login" to="/login" className="font-semibold text-accent hover:underline">Faça login</Link>
          </p>
        </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;

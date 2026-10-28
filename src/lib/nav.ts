import {
  LayoutDashboard, Users, Megaphone,
  BarChart3, FileText, ShieldPlus, Settings, UserPlus,
  Wallet, GraduationCap, Receipt, ListChecks, FilePlus, BookMarked, RotateCcw,
  Shirt, Inbox, Send, Table2, Database, CalendarCheck, CalendarDays, CreditCard, PiggyBank, Link2, Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  section?: string;
  badgeKey?: string;
}

export const adminNav: NavItem[] = [
  // Bloco 1 — Cockpit
  { label: "Dados em Tempo Real", path: "/admin/dados", icon: Table2, section: "Cockpit" },
  { label: "Listas 2026/2027", path: "/admin/dados", icon: ListChecks, section: "Cockpit" },

  // Bloco 2 — Vida Escolar
  { label: "Pauta Geral", path: "/admin/pauta-geral", icon: Table2, section: "Vida Escolar" },
  { label: "Comunicados", path: "/admin/announcements", icon: Megaphone, section: "Vida Escolar" },

  // Bloco 3 — Gestão Estratégica
  { label: "Relatórios e Gráficos", path: "/admin/reports", icon: BarChart3, section: "Gestão Estratégica" },
  { label: "Documentos Oficiais", path: "/documentos", icon: FileText, section: "Gestão Estratégica" },

  // Bloco 4 — Administração
  { label: "Administradores", path: "/administradores", icon: ShieldPlus, section: "Administração" },
];


export const secretarioNav: NavItem[] = [
  { label: "Dashboard", path: "/secretario", icon: LayoutDashboard },
  { label: "Matrículas", path: "/secretario/enrollment", icon: UserPlus },
  { label: "Confirmações", path: "/confirmacao", icon: RotateCcw },
  { label: "Propinas e Dívidas", path: "/secretario/payments", icon: Receipt },
  { label: "Finanças", path: "/secretario/financas", icon: PiggyBank },
  { label: "Uniformes", path: "/secretario/uniformes", icon: Shirt },
  { label: "Comunicados", path: "/secretario/announcements", icon: Megaphone },
];

export const professorNav: NavItem[] = [
  { label: "Dashboard", path: "/professor", icon: LayoutDashboard },
  { label: "Comunicados", path: "/professor/announcements", icon: Megaphone },
  { label: "Mini Pauta", path: "/pauta", icon: Table2 },
  { label: "Boletins", path: "/professor/boletins", icon: FileText },
  { label: "Frequência", path: "/professor/attendance", icon: CalendarCheck },
  { label: "Sumários", path: "/professor/summaries", icon: BookMarked },
  { label: "Relatórios", path: "/professor/reports", icon: BarChart3 },
];

export const alunoNav: NavItem[] = [
  { label: "Início", path: "/aluno", icon: LayoutDashboard },
  { label: "Ranking da Turma", path: "/aluno/ranking", icon: Trophy },
  { label: "Comunicados / Horários", path: "/aluno/horarios", icon: CalendarDays },
  { label: "Pagamentos", path: "/aluno/payments", icon: Wallet },
];


export const encarregadoNav: NavItem[] = [
  { label: "Início", path: "/encarregado", icon: LayoutDashboard },
  { label: "Associar Educando", path: "/encarregado/vinculo", icon: Link2 },
  { label: "Meus Educandos", path: "/encarregado/students", icon: Users },
  { label: "Comunicados / Horários", path: "/aluno/horarios", icon: CalendarDays },
  { label: "Pagamentos", path: "/encarregado/payments", icon: Wallet },
  { label: "Pedir Documentos", path: "/secretaria-virtual", icon: Send },
];

import RoleLayout from "@/components/RoleLayout";
import { LayoutDashboard, GraduationCap, CalendarCheck, BookOpen } from "lucide-react";

const alunoNav = [
  { label: "Início", path: "/aluno", icon: LayoutDashboard },
  { label: "Notas", path: "/aluno/grades", icon: GraduationCap },
  { label: "Horários", path: "/aluno/schedules", icon: CalendarCheck },
  { label: "Materiais", path: "/aluno/materials", icon: BookOpen },
];

const AlunoSchedules = () => (
  <RoleLayout title="Aluno" subtitle="Herdeiros do Futuro" headerLabel="Horários" navItems={alunoNav}>
    <div className="space-y-6">
      <h1 className="font-montserrat font-bold text-2xl lg:text-3xl text-foreground">Horários</h1>
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-muted-foreground text-sm">Os seus horários de aulas aparecerão aqui. Funcionalidade em desenvolvimento.</p>
      </div>
    </div>
  </RoleLayout>
);

export default AlunoSchedules;

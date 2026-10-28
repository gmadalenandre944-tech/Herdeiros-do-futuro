import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoSchedules from "@/screens/AlunoSchedules";

export const Route = createFileRoute("/aluno/schedules")({
  head: () => ({ meta: [
    { title: "Aluno · Schedules | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Schedules." },
    { property: "og:title", content: "Aluno · Schedules | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Schedules." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoSchedules /></RoleGuard>; }

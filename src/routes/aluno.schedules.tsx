import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoSchedules from "@/screens/AlunoSchedules";

export const Route = createFileRoute("/aluno/schedules")({
  head: () => ({ meta: [
    { title: "Aluno · Schedules | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno · Schedules." },
    { property: "og:title", content: "Aluno · Schedules | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno · Schedules." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoSchedules /></RoleGuard>; }

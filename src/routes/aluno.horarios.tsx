import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoHorarios from "@/screens/AlunoHorarios";

export const Route = createFileRoute("/aluno/horarios")({
  head: () => ({ meta: [
    { title: "Aluno · Horarios | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Horarios." },
    { property: "og:title", content: "Aluno · Horarios | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Horarios." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno","encarregado","professor"]}><AlunoHorarios /></RoleGuard>; }

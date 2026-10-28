import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorGrades from "@/screens/ProfessorGrades";

export const Route = createFileRoute("/professor/grades")({
  head: () => ({ meta: [
    { title: "Professor · Grades | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Grades." },
    { property: "og:title", content: "Professor · Grades | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Grades." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorGrades /></RoleGuard>; }

import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorGrades from "@/screens/ProfessorGrades";

export const Route = createFileRoute("/professor/grades")({
  head: () => ({ meta: [
    { title: "Professor · Grades | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor · Grades." },
    { property: "og:title", content: "Professor · Grades | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor · Grades." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorGrades /></RoleGuard>; }

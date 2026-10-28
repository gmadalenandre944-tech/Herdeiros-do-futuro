import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorReports from "@/screens/ProfessorReports";

export const Route = createFileRoute("/professor/reports")({
  head: () => ({ meta: [
    { title: "Professor · Reports | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor · Reports." },
    { property: "og:title", content: "Professor · Reports | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor · Reports." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorReports /></RoleGuard>; }

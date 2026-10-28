import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorDashboard from "@/screens/ProfessorDashboard";

export const Route = createFileRoute("/professor/")({
  head: () => ({ meta: [
    { title: "Professor | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor." },
    { property: "og:title", content: "Professor | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorDashboard /></RoleGuard>; }

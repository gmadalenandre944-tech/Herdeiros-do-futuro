import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorClasses from "@/screens/ProfessorClasses";

export const Route = createFileRoute("/professor/classes")({
  head: () => ({ meta: [
    { title: "Professor · Classes | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor · Classes." },
    { property: "og:title", content: "Professor · Classes | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor · Classes." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorClasses /></RoleGuard>; }

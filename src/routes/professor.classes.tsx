import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorClasses from "@/screens/ProfessorClasses";

export const Route = createFileRoute("/professor/classes")({
  head: () => ({ meta: [
    { title: "Professor · Classes | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Classes." },
    { property: "og:title", content: "Professor · Classes | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Classes." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorClasses /></RoleGuard>; }

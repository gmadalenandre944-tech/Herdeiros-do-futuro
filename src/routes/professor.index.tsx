import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorDashboard from "@/screens/ProfessorDashboard";

export const Route = createFileRoute("/professor/")({
  head: () => ({ meta: [
    { title: "Professor | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor." },
    { property: "og:title", content: "Professor | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorDashboard /></RoleGuard>; }

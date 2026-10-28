import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorBoletins from "@/screens/ProfessorBoletins";

export const Route = createFileRoute("/professor/boletins")({
  head: () => ({ meta: [
    { title: "Professor · Boletins | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Boletins." },
    { property: "og:title", content: "Professor · Boletins | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Professor · Boletins." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorBoletins /></RoleGuard>; }

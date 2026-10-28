import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorBoletins from "@/screens/ProfessorBoletins";

export const Route = createFileRoute("/professor/boletins")({
  head: () => ({ meta: [
    { title: "Professor · Boletins | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor · Boletins." },
    { property: "og:title", content: "Professor · Boletins | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor · Boletins." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorBoletins /></RoleGuard>; }

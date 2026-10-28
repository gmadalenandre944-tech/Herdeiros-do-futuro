import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoMaterials from "@/screens/AlunoMaterials";

export const Route = createFileRoute("/aluno/materials")({
  head: () => ({ meta: [
    { title: "Aluno · Materials | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno · Materials." },
    { property: "og:title", content: "Aluno · Materials | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno · Materials." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoMaterials /></RoleGuard>; }

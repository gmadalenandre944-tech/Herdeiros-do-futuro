import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoMaterials from "@/screens/AlunoMaterials";

export const Route = createFileRoute("/aluno/materials")({
  head: () => ({ meta: [
    { title: "Aluno · Materials | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Materials." },
    { property: "og:title", content: "Aluno · Materials | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Materials." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoMaterials /></RoleGuard>; }

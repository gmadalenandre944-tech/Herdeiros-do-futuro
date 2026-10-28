import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Matricula from "@/screens/Matricula";

export const Route = createFileRoute("/matricula")({
  head: () => ({ meta: [
    { title: "Matricula | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Matricula." },
    { property: "og:title", content: "Matricula | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Matricula." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><Matricula /></RoleGuard>; }

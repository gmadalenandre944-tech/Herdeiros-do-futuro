import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Documentos from "@/screens/Documentos";

export const Route = createFileRoute("/documentos")({
  head: () => ({ meta: [
    { title: "Documentos | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Documentos." },
    { property: "og:title", content: "Documentos | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Documentos." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><Documentos /></RoleGuard>; }

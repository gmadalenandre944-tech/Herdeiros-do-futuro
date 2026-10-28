import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Administradores from "@/screens/Administradores";

export const Route = createFileRoute("/administradores")({
  head: () => ({ meta: [
    { title: "Administradores | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Administradores." },
    { property: "og:title", content: "Administradores | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Administradores." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><Administradores /></RoleGuard>; }

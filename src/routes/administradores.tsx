import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import Administradores from "@/screens/Administradores";

export const Route = createFileRoute("/administradores")({
  head: () => ({ meta: [
    { title: "Administradores | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Administradores." },
    { property: "og:title", content: "Administradores | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Administradores." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><Administradores /></RoleGuard>; }

import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioDashboard from "@/screens/SecretarioDashboard";


export const Route = createFileRoute("/secretario/")({
  head: () => ({ meta: [
    { title: "Secretario | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario." },
    { property: "og:title", content: "Secretario | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioDashboard /></RoleGuard>; }

import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioDashboard from "@/screens/SecretarioDashboard";

export const Route = createFileRoute("/secretaria")({
  head: () => ({ meta: [
    { title: "Secretaria | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretaria." },
    { property: "og:title", content: "Secretaria | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretaria." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioDashboard /></RoleGuard>; }

import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioDashboard from "@/screens/SecretarioDashboard";

export const Route = createFileRoute("/secretaria")({
  head: () => ({ meta: [
    { title: "Secretaria | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretaria." },
    { property: "og:title", content: "Secretaria | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretaria." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioDashboard /></RoleGuard>; }

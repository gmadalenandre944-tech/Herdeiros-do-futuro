import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioDashboard from "@/screens/SecretarioDashboard";


export const Route = createFileRoute("/secretario/")({
  head: () => ({ meta: [
    { title: "Secretario | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario." },
    { property: "og:title", content: "Secretario | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioDashboard /></RoleGuard>; }

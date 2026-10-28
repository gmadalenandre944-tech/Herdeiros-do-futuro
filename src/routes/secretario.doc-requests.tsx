import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioDocRequests from "@/screens/SecretarioDocRequests";

export const Route = createFileRoute("/secretario/doc-requests")({
  head: () => ({ meta: [
    { title: "Secretario · Doc Requests | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Doc Requests." },
    { property: "og:title", content: "Secretario · Doc Requests | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Doc Requests." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioDocRequests /></RoleGuard>; }

import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioDocRequests from "@/screens/SecretarioDocRequests";

export const Route = createFileRoute("/secretario/doc-requests")({
  head: () => ({ meta: [
    { title: "Secretario · Doc Requests | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Doc Requests." },
    { property: "og:title", content: "Secretario · Doc Requests | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Doc Requests." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioDocRequests /></RoleGuard>; }

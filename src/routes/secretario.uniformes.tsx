import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioUniformes from "@/screens/SecretarioUniformes";

export const Route = createFileRoute("/secretario/uniformes")({
  head: () => ({ meta: [
    { title: "Secretario · Uniformes | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Uniformes." },
    { property: "og:title", content: "Secretario · Uniformes | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Uniformes." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioUniformes /></RoleGuard>; }

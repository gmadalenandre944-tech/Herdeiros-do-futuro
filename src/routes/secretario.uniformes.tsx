import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioUniformes from "@/screens/SecretarioUniformes";

export const Route = createFileRoute("/secretario/uniformes")({
  head: () => ({ meta: [
    { title: "Secretario · Uniformes | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Uniformes." },
    { property: "og:title", content: "Secretario · Uniformes | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Uniformes." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioUniformes /></RoleGuard>; }

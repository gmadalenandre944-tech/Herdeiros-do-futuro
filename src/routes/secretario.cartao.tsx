import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioCartao from "@/screens/SecretarioCartao";

export const Route = createFileRoute("/secretario/cartao")({
  head: () => ({ meta: [
    { title: "Secretario · Cartao | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Cartao." },
    { property: "og:title", content: "Secretario · Cartao | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Cartao." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioCartao /></RoleGuard>; }

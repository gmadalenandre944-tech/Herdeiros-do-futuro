import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioCartao from "@/screens/SecretarioCartao";

export const Route = createFileRoute("/secretario/cartao")({
  head: () => ({ meta: [
    { title: "Secretario · Cartao | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Cartao." },
    { property: "og:title", content: "Secretario · Cartao | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Cartao." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioCartao /></RoleGuard>; }

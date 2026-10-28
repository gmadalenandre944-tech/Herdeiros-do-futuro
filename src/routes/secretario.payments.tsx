import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioPayments from "@/screens/SecretarioPayments";

export const Route = createFileRoute("/secretario/payments")({
  head: () => ({ meta: [
    { title: "Secretario · Payments | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Payments." },
    { property: "og:title", content: "Secretario · Payments | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Payments." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioPayments /></RoleGuard>; }

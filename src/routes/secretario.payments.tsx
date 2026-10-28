import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioPayments from "@/screens/SecretarioPayments";

export const Route = createFileRoute("/secretario/payments")({
  head: () => ({ meta: [
    { title: "Secretario · Payments | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Payments." },
    { property: "og:title", content: "Secretario · Payments | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Payments." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioPayments /></RoleGuard>; }

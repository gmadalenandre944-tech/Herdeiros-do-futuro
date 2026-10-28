import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoPayments from "@/screens/EncarregadoPayments";

export const Route = createFileRoute("/encarregado/payments")({
  head: () => ({ meta: [
    { title: "Encarregado · Payments | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Encarregado · Payments." },
    { property: "og:title", content: "Encarregado · Payments | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Encarregado · Payments." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoPayments /></RoleGuard>; }

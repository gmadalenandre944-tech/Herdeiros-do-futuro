import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import EncarregadoPayments from "@/screens/EncarregadoPayments";

export const Route = createFileRoute("/encarregado/payments")({
  head: () => ({ meta: [
    { title: "Encarregado · Payments | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado · Payments." },
    { property: "og:title", content: "Encarregado · Payments | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Encarregado · Payments." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["encarregado"]}><EncarregadoPayments /></RoleGuard>; }

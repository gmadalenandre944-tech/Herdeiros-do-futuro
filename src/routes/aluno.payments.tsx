import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoPayments from "@/screens/AlunoPayments";

export const Route = createFileRoute("/aluno/payments")({
  head: () => ({ meta: [
    { title: "Aluno · Payments | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Payments." },
    { property: "og:title", content: "Aluno · Payments | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Aluno · Payments." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoPayments /></RoleGuard>; }

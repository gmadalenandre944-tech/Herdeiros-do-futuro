import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AlunoPayments from "@/screens/AlunoPayments";

export const Route = createFileRoute("/aluno/payments")({
  head: () => ({ meta: [
    { title: "Aluno · Payments | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Aluno · Payments." },
    { property: "og:title", content: "Aluno · Payments | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Aluno · Payments." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["aluno"]}><AlunoPayments /></RoleGuard>; }

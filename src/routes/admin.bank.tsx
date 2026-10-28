import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminBankSettings from "@/screens/AdminBankSettings";

export const Route = createFileRoute("/admin/bank")({
  head: () => ({ meta: [
    { title: "Admin · Bank | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Bank." },
    { property: "og:title", content: "Admin · Bank | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Bank." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminBankSettings /></RoleGuard>; }

import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminBankSettings from "@/screens/AdminBankSettings";

export const Route = createFileRoute("/admin/bank")({
  head: () => ({ meta: [
    { title: "Admin · Bank | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Admin · Bank." },
    { property: "og:title", content: "Admin · Bank | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Admin · Bank." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminBankSettings /></RoleGuard>; }

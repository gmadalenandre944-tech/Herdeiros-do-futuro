import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioEnrollment from "@/screens/SecretarioEnrollment";

export const Route = createFileRoute("/secretario/enrollment")({
  head: () => ({ meta: [
    { title: "Secretario · Enrollment | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Enrollment." },
    { property: "og:title", content: "Secretario · Enrollment | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Enrollment." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioEnrollment /></RoleGuard>; }

import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioEnrollment from "@/screens/SecretarioEnrollment";

export const Route = createFileRoute("/secretario/enrollment")({
  head: () => ({ meta: [
    { title: "Secretario · Enrollment | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Enrollment." },
    { property: "og:title", content: "Secretario · Enrollment | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Enrollment." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioEnrollment /></RoleGuard>; }

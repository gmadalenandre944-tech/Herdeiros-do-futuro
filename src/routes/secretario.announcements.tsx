import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioAnnouncements from "@/screens/SecretarioAnnouncements";

export const Route = createFileRoute("/secretario/announcements")({
  head: () => ({ meta: [
    { title: "Secretario · Announcements | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Announcements." },
    { property: "og:title", content: "Secretario · Announcements | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Secretario · Announcements." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioAnnouncements /></RoleGuard>; }

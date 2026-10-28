import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import SecretarioAnnouncements from "@/screens/SecretarioAnnouncements";

export const Route = createFileRoute("/secretario/announcements")({
  head: () => ({ meta: [
    { title: "Secretario · Announcements | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Secretario · Announcements." },
    { property: "og:title", content: "Secretario · Announcements | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Secretario · Announcements." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["secretario"]}><SecretarioAnnouncements /></RoleGuard>; }

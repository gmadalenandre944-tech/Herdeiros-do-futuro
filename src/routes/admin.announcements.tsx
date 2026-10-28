import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminAnnouncements from "@/screens/AdminAnnouncements";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [
    { title: "Admin · Announcements | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Admin · Announcements." },
    { property: "og:title", content: "Admin · Announcements | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Admin · Announcements." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminAnnouncements /></RoleGuard>; }

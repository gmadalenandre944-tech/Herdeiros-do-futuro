import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import AdminAnnouncements from "@/screens/AdminAnnouncements";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [
    { title: "Admin · Announcements | Herdeiros do Futuro" },
    { name: "description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Announcements." },
    { property: "og:title", content: "Admin · Announcements | Herdeiros do Futuro" },
    { property: "og:description", content: "Plataforma escolar Herdeiros do Futuro — Admin · Announcements." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["admin"]}><AdminAnnouncements /></RoleGuard>; }

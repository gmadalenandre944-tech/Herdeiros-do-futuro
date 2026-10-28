import { createFileRoute } from "@tanstack/react-router";
import RoleGuard from "@/components/RoleGuard";
import ProfessorAttendance from "@/screens/ProfessorAttendance";

export const Route = createFileRoute("/professor/attendance")({
  head: () => ({ meta: [
    { title: "Professor · Attendance | Future Roots" },
    { name: "description", content: "Plataforma escolar Future Roots — Professor · Attendance." },
    { property: "og:title", content: "Professor · Attendance | Future Roots" },
    { property: "og:description", content: "Plataforma escolar Future Roots — Professor · Attendance." },
  ] }),
  component: Page,
});

function Page() { return <RoleGuard allowedRoles={["professor"]}><ProfessorAttendance /></RoleGuard>; }

import { useQuery } from "convex/react";
import { Users, CalendarCheck, CalendarX, Wifi, CalendarClock, Plane, Code2, ListTodo, AlertTriangle, Hourglass } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { KpiCard } from "@/components/kpi-card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { toast } from "sonner";

export function DashboardKpis() {
  const { selectedCompanyId } = useCompanyFilter();
  const kpis = useQuery(api.dashboard.getKpis, { companyId: selectedCompanyId });
  if (kpis === undefined) return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
    </div>
  );
  const comingSoon = () => toast.info("Coming soon in a future milestone!");
  const cards = [
    { label: "Total Employees", value: kpis.totalEmployees, icon: <Users className="size-4.5" />, accent: "primary" as const, subtext: "Across both companies" },
    { label: "Present Today", value: kpis.presentToday, icon: <CalendarCheck className="size-4.5" />, accent: "emerald" as const },
    { label: "Absent Today", value: kpis.absentToday, icon: <CalendarX className="size-4.5" />, accent: "red" as const },
    { label: "Working Remotely", value: kpis.remoteToday, icon: <Wifi className="size-4.5" />, accent: "sky" as const },
    { label: "On Leave", value: kpis.onLeave, icon: <CalendarClock className="size-4.5" />, accent: "purple" as const },
    { label: "Nakamura Travels", value: kpis.nakamuraCount, icon: <Plane className="size-4.5" />, accent: "sky" as const, subtext: "Reservation / Travel" },
    { label: "Innovate IT Hub", value: kpis.innovateCount, icon: <Code2 className="size-4.5" />, accent: "purple" as const, subtext: "IT / Web / Marketing" },
    { label: "Open Tasks", value: kpis.openTasks, icon: <ListTodo className="size-4.5" />, accent: "amber" as const },
    { label: "Overdue Tasks", value: kpis.overdueTasks, icon: <AlertTriangle className="size-4.5" />, accent: "red" as const },
    { label: "Pending Leave Requests", value: kpis.pendingLeaveRequests, icon: <Hourglass className="size-4.5" />, accent: "amber" as const },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => <KpiCard key={card.label} {...card} onClick={comingSoon} />)}
    </div>
  );
}

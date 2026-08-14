import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { SignInButton } from "@/components/ui/signin.tsx";
import { DashboardHeader } from "./_components/dashboard-header.tsx";
import { DashboardKpis } from "./_components/dashboard-kpis.tsx";
import { AttendanceOverviewChart } from "./_components/attendance-overview-chart.tsx";
import { DepartmentTeamsCard } from "./_components/department-teams-card.tsx";
import { TodaysTeamPresence } from "./_components/todays-team-presence.tsx";
import { OngoingTasksCard } from "./_components/ongoing-tasks-card.tsx";
import { QuickActionsCard } from "./_components/quick-actions-card.tsx";
import { RecentActivityCard } from "./_components/recent-activity-card.tsx";
import { UpcomingEventsCard } from "./_components/upcoming-events-card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

export default function Dashboard() {
  return (
    <>
      <Authenticated><DashboardContent /></Authenticated>
      <Unauthenticated><SignedOutView /></Unauthenticated>
      <AuthLoading><div className="space-y-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-40 w-full" /></div></AuthLoading>
    </>
  );
}

function DashboardContent() {
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
      <DashboardHeader />
      <DashboardKpis />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <AttendanceOverviewChart />
        <div className="lg:col-span-2"><DepartmentTeamsCard /></div>
      </div>
      <TodaysTeamPresence />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2"><OngoingTasksCard /></div>
        <QuickActionsCard />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <UpcomingEventsCard />
        <div className="lg:col-span-2"><RecentActivityCard /></div>
      </div>
    </div>
  );
}

function SignedOutView() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-balance">Nakamura {"\u00d7"} Innovate HR Hub</h1>
        <p className="mt-2 text-muted-foreground">One Team. Two Brands. Bigger Future.</p>
      </div>
      <SignInButton size="lg" />
    </div>
  );
}

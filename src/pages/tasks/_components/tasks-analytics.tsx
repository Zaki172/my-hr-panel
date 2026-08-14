import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Pie, PieChart, Cell } from "recharts";
import { format, differenceInCalendarDays } from "date-fns";
import { ListChecks, PieChart as PieIcon, Flag, Users, Target, ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { PriorityBadge } from "@/components/status-badges.tsx";
import { cn } from "@/lib/utils.ts";

const TASK_STATUS_LABEL: Record<string, string> = { not_started: "Not Started", in_progress: "In Progress", review: "Review", completed: "Completed", on_hold: "On Hold" };
const TASK_STATUS_BAR: Record<string, string> = { not_started: "bg-slate-400", in_progress: "bg-sky-500", review: "bg-amber-500", completed: "bg-emerald-500", on_hold: "bg-red-500" };
const PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
const PRIORITY_BAR: Record<string, string> = { low: "bg-slate-400", medium: "bg-sky-500", high: "bg-amber-500", urgent: "bg-red-500" };
const projectStatusConfig = { not_started: { label: "Not Started", color: "var(--chart-4)" }, in_progress: { label: "In Progress", color: "var(--chart-1)" }, review: { label: "Review", color: "var(--chart-5)" }, completed: { label: "Completed", color: "var(--chart-2)" }, on_hold: { label: "On Hold", color: "var(--chart-3)" } } satisfies ChartConfig;
const PROJECT_STATUS_FILL: Record<string, string> = { not_started: "var(--chart-4)", in_progress: "var(--chart-1)", review: "var(--chart-5)", completed: "var(--chart-2)", on_hold: "var(--chart-3)" };

export function TasksAnalytics({ companyId }: { companyId: Id<"companies"> | undefined }) {
  const navigate = useNavigate();
  const data = useQuery(api.projects.analytics, { companyId });
  const taskStatusRows = useMemo(() => { if (!data) return []; return (["completed", "in_progress", "review", "not_started", "on_hold"] as const).map((key) => ({ key, label: TASK_STATUS_LABEL[key], value: data.taskStatus[key] })); }, [data]);
  const priorityRows = useMemo(() => { if (!data) return []; return (["urgent", "high", "medium", "low"] as const).map((key) => ({ key, label: PRIORITY_LABEL[key], value: data.priority[key] })); }, [data]);
  const projectDonut = useMemo(() => { if (!data) return []; return (Object.keys(data.projectStatus) as (keyof typeof data.projectStatus)[]).map((key) => ({ key, label: projectStatusConfig[key].label, value: data.projectStatus[key], fill: PROJECT_STATUS_FILL[key] })).filter((d) => d.value > 0); }, [data]);
  const maxWorkload = useMemo(() => { if (!data || data.workload.length === 0) return 1; return Math.max(...data.workload.map((w) => w.total), 1); }, [data]);
  const isLoading = data === undefined;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ListChecks className="size-4 text-primary" />Task Progress Overview</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            {isLoading ? <Skeleton className="h-40 w-full" /> : data.totalTasks === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No tasks yet</p> : taskStatusRows.map((row) => { const pct = data.totalTasks > 0 ? Math.round((row.value / data.totalTasks) * 100) : 0; return (<div key={row.key} className="flex flex-col gap-1"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{row.label}</span><span className="font-medium tabular-nums">{row.value} <span className="text-xs text-muted-foreground">({pct}%)</span></span></div><div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", TASK_STATUS_BAR[row.key])} style={{ width: `${pct}%` }} /></div></div>); })}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieIcon className="size-4 text-primary" />Project Status Summary</CardTitle></CardHeader>
          <CardContent>{isLoading ? <Skeleton className="h-40 w-full" /> : projectDonut.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No projects yet</p> : (<div className="flex items-center gap-3"><ChartContainer config={projectStatusConfig} className="relative aspect-square h-40 w-40 shrink-0"><PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Pie data={projectDonut} dataKey="value" nameKey="label" innerRadius={45} outerRadius={68} strokeWidth={3}>{projectDonut.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}</Pie></PieChart></ChartContainer><div className="flex flex-1 flex-col gap-2">{projectDonut.map((entry) => (<div key={entry.key} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: entry.fill }} /><span className="text-muted-foreground">{entry.label}</span></div><span className="font-semibold tabular-nums">{entry.value}</span></div>))}</div></div>)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Flag className="size-4 text-primary" />Priority Breakdown</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">{isLoading ? <Skeleton className="h-40 w-full" /> : data.totalTasks === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No tasks yet</p> : priorityRows.map((row) => { const pct = data.totalTasks > 0 ? Math.round((row.value / data.totalTasks) * 100) : 0; return (<div key={row.key} className="flex flex-col gap-1"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{row.label}</span><span className="font-medium tabular-nums">{row.value}</span></div><div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full", PRIORITY_BAR[row.key])} style={{ width: `${pct}%` }} /></div></div>); })}</CardContent>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="size-4 text-primary" />Team Workload</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">{isLoading ? (<div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>) : data.workload.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No assigned tasks yet</p> : data.workload.map((w) => (<div key={w.employeeId} className="flex items-center gap-3"><Avatar className="size-8 shrink-0"><AvatarImage src={w.photoUrl} /><AvatarFallback className="text-xs">{w.name.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex items-center justify-between text-sm"><span className="truncate font-medium">{w.name}</span><span className="text-xs text-muted-foreground">{w.open} open · {w.completed} done</span></div><div className="mt-1 flex h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-sky-500" style={{ width: `${(w.open / maxWorkload) * 100}%` }} /><div className="h-full bg-emerald-500" style={{ width: `${(w.completed / maxWorkload) * 100}%` }} /></div></div></div>))}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Target className="size-4 text-primary" />Project Milestones</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-1">{isLoading ? (<div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>) : data.milestones.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">No upcoming milestones</p> : data.milestones.map((m) => { const daysLeft = differenceInCalendarDays(new Date(m.deadline + "T00:00:00"), new Date()); const overdue = daysLeft < 0; return (<button key={m.projectId} onClick={() => navigate(`/tasks/${m.projectId}`)} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-accent/60"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{m.name}</p><PriorityBadge priority={m.priority} /></div><div className="mt-1 flex items-center gap-2"><Progress value={m.progress} className="h-1.5 flex-1" /><span className="shrink-0 text-xs text-muted-foreground">{m.progress}%</span></div></div><div className="flex shrink-0 flex-col items-end"><span className={cn("text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>{format(new Date(m.deadline + "T00:00:00"), "MMM d")}</span><span className={cn("text-[10px]", overdue ? "text-destructive" : "text-muted-foreground")}>{overdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? "Due today" : `${daysLeft}d left`}</span></div><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></button>); })}</CardContent>
        </Card>
      </div>
    </div>
  );
}

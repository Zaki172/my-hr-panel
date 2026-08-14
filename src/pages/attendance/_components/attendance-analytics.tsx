import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Pie, PieChart, Cell } from "recharts";
import { Clock, Building2, Home, Laptop, AlertTriangle } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

const workModeConfig = { office: { label: "Office", color: "var(--chart-1)" }, remote: { label: "Remote", color: "var(--chart-2)" }, hybrid: { label: "Hybrid", color: "var(--chart-3)" } } satisfies ChartConfig;

function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function fmtMinutesOfDay(minutes: number | null): string { if (minutes === null) return "\u2014"; const h = Math.floor(minutes / 60); const m = minutes % 60; const period = h >= 12 ? "PM" : "AM"; const hr12 = h % 12 === 0 ? 12 : h % 12; return `${hr12}:${m.toString().padStart(2, "0")} ${period}`; }

const WORK_MODE_ICON = { office: Building2, remote: Home, hybrid: Laptop } as const;

export function AttendanceAnalytics({ date, companyId }: { date: string; companyId: Id<"companies"> | undefined }) {
  const analytics = useQuery(api.attendance.analyticsByDate, { date, companyId });
  const donutData = useMemo(() => {
    if (!analytics) return [];
    return [{ key: "office", label: "Office", value: analytics.workMode.office, fill: "var(--chart-1)" }, { key: "remote", label: "Remote", value: analytics.workMode.remote, fill: "var(--chart-2)" }, { key: "hybrid", label: "Hybrid", value: analytics.workMode.hybrid, fill: "var(--chart-3)" }].filter((d) => d.value > 0);
  }, [analytics]);
  const totalMode = donutData.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Work Mode Distribution</CardTitle></CardHeader>
        <CardContent>
          {analytics === undefined ? <Skeleton className="h-44 w-full" /> : donutData.length === 0 ? <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">No check-ins yet</div> : (
            <div className="flex items-center gap-4">
              <ChartContainer config={workModeConfig} className="aspect-square h-40 w-40 shrink-0">
                <PieChart><ChartTooltip content={<ChartTooltipContent hideLabel />} /><Pie data={donutData} dataKey="value" nameKey="label" innerRadius={45} outerRadius={68} strokeWidth={3}>{donutData.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}</Pie></PieChart>
              </ChartContainer>
              <div className="flex flex-1 flex-col gap-2.5">{donutData.map((entry) => { const Icon = WORK_MODE_ICON[entry.key as keyof typeof WORK_MODE_ICON]; const pct = totalMode > 0 ? Math.round((entry.value / totalMode) * 100) : 0; return (<div key={entry.key} className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-md" style={{ backgroundColor: `${entry.fill}20`, color: entry.fill }}><Icon className="size-3.5" /></span><span className="text-muted-foreground">{entry.label}</span></div><span className="font-semibold tabular-nums">{entry.value} <span className="text-xs text-muted-foreground">({pct}%)</span></span></div>); })}</div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="size-4 text-amber-500" />Late Arrivals</CardTitle></CardHeader>
        <CardContent>
          {analytics === undefined ? (<div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>) : analytics.lateArrivals.length === 0 ? (<div className="flex h-44 flex-col items-center justify-center gap-1 text-center"><Clock className="size-6 text-emerald-500" /><p className="text-sm font-medium">No late arrivals</p><p className="text-xs text-muted-foreground">Everyone was on time</p></div>) : (<div className="flex max-h-44 flex-col gap-1 overflow-y-auto">{analytics.lateArrivals.map((emp) => (<div key={emp.employeeId} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5"><Avatar className="size-8"><AvatarImage src={emp.photoUrl} /><AvatarFallback className="text-xs">{emp.fullName.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{emp.fullName}</p><p className="truncate text-xs text-muted-foreground">{emp.position}</p></div><span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">{fmtTime(emp.checkInAt)}</span></div>))}</div>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Avg Check-in Time</CardTitle></CardHeader>
        <CardContent className="flex h-44 flex-col items-center justify-center gap-3">{analytics === undefined ? <Skeleton className="h-20 w-32" /> : (<><div className="flex size-16 items-center justify-center rounded-full bg-primary/10"><Clock className="size-7 text-primary" /></div><div className="text-center"><p className="text-3xl font-bold tracking-tight text-primary">{fmtMinutesOfDay(analytics.avgCheckInMinutes)}</p><p className="mt-1 text-xs text-muted-foreground">{analytics.checkedInCount} check-in{analytics.checkedInCount === 1 ? "" : "s"} today</p></div></>)}</CardContent>
      </Card>
    </div>
  );
}

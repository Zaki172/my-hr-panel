import { useMemo } from "react";
import { useQuery } from "convex/react";
import { Pie, PieChart, Cell } from "recharts";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";

const chartConfig = { present: { label: "Present", color: "var(--chart-1)" }, remote: { label: "Remote", color: "var(--chart-2)" }, absent: { label: "Absent", color: "var(--chart-4)" }, leave: { label: "On Leave", color: "var(--chart-3)" }, halfDay: { label: "Half Day", color: "var(--chart-5)" } } satisfies ChartConfig;

export function AttendanceOverviewChart() {
  const { selectedCompanyId } = useCompanyFilter();
  const overview = useQuery(api.dashboard.getAttendanceOverview, { companyId: selectedCompanyId });
  const data = useMemo(() => {
    if (!overview) return [];
    return [
      { key: "present", label: "Present", value: overview.present, fill: "var(--chart-1)" },
      { key: "remote", label: "Work From Home", value: overview.remote, fill: "var(--chart-2)" },
      { key: "absent", label: "Absent", value: overview.absent, fill: "var(--chart-4)" },
      { key: "leave", label: "On Leave", value: overview.leave, fill: "var(--chart-3)" },
      { key: "halfDay", label: "Half Day", value: overview.halfDay, fill: "var(--chart-5)" },
    ].filter((d) => d.value > 0);
  }, [overview]);
  return (
    <Card className="col-span-1">
      <CardHeader className="flex items-center justify-between"><CardTitle>Attendance Overview</CardTitle></CardHeader>
      <CardContent>
        {overview === undefined ? <Skeleton className="h-52 w-full" /> : data.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">No attendance marked yet today</div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-52 w-full max-w-52">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={data} dataKey="value" nameKey="label" innerRadius={55} outerRadius={80} strokeWidth={3}>
                  {data.map((entry) => <Cell key={entry.key} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-1 flex-col gap-2.5">
              <div className="mb-1 text-center sm:text-left">
                <p className="text-3xl font-bold tracking-tight text-primary">{overview.presentPercentage}%</p>
                <p className="text-xs text-muted-foreground">Present today</p>
              </div>
              {data.map((entry) => (
                <div key={entry.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ backgroundColor: entry.fill }} /><span className="text-muted-foreground">{entry.label}</span></div>
                  <span className="font-semibold tabular-nums">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

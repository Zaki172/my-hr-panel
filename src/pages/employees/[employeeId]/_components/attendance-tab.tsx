import { useState } from "react";
import { useQuery } from "convex/react";
import { format, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AttendanceStatusBadge } from "@/components/status-badges.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

function fmtTime(iso?: string) { return iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "\u2014"; }

export function AttendanceTab({ employeeId }: { employeeId: Id<"employees"> }) {
  const [month, setMonth] = useState(new Date());
  const records = useQuery(api.attendance.listByEmployeeAndMonth, { employeeId, month: format(month, "yyyy-MM") });
  const sorted = records ? [...records].sort((a, b) => b.date.localeCompare(a.date)) : undefined;
  const summary = records ? { present: records.filter((r) => r.status === "present" || r.status === "late").length, remote: records.filter((r) => r.status === "remote").length, absent: records.filter((r) => r.status === "absent").length, leave: records.filter((r) => r.status === "leave").length } : null;
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="size-4 text-primary" />Attendance</CardTitle>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="size-4" /></Button>
          <span className="min-w-[7rem] text-center text-sm font-medium">{format(month, "MMMM yyyy")}</span>
          <Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {summary && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[{ label: "Present", value: summary.present, color: "text-emerald-600 dark:text-emerald-400" }, { label: "Remote", value: summary.remote, color: "text-sky-600 dark:text-sky-400" }, { label: "Absent", value: summary.absent, color: "text-red-600 dark:text-red-400" }, { label: "On Leave", value: summary.leave, color: "text-purple-600 dark:text-purple-400" }].map((s) => (
              <div key={s.label} className="rounded-lg bg-muted/40 p-3"><p className={`text-xl font-bold ${s.color}`}>{s.value}</p><p className="text-xs text-muted-foreground">{s.label}</p></div>
            ))}
          </div>
        )}
        {records === undefined ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : sorted && sorted.length === 0 ? (
          <Empty><EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>No records</EmptyTitle><EmptyDescription>No attendance recorded for {format(month, "MMMM yyyy")}.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 pr-4 font-medium">Date</th><th className="pb-2 pr-4 font-medium">Status</th><th className="pb-2 pr-4 font-medium">Check In</th><th className="pb-2 pr-4 font-medium">Check Out</th><th className="pb-2 font-medium">Hours</th></tr></thead>
              <tbody className="divide-y">
                {sorted?.map((r) => (
                  <tr key={r._id}>
                    <td className="py-2.5 pr-4 font-medium">{format(new Date(r.date + "T00:00:00"), "EEE, MMM d")}</td>
                    <td className="py-2.5 pr-4"><AttendanceStatusBadge status={r.status} /></td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{fmtTime(r.checkInAt)}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{fmtTime(r.checkOutAt)}</td>
                    <td className="py-2.5 text-muted-foreground">{typeof r.workingHours === "number" ? `${r.workingHours}h` : "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

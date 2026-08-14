import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isToday } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, List } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { LeaveStatusBadge } from "@/components/status-badges.tsx";
import { cn } from "@/lib/utils.ts";
import { LEAVE_TYPE_LABELS, LEAVE_TYPE_DOT, LEAVE_TYPE_BADGE } from "../_lib/leave-constants.ts";

type CalendarLeave = { _id: Id<"leaveRequests">; employeeId: Id<"employees">; employeeName: string; employeePhoto: string | null; leaveType: string; startDate: string; endDate: string; numberOfDays: number; status: "pending" | "approved" | "rejected" };
type ViewMode = "month" | "list";
function toIso(date: Date): string { return format(date, "yyyy-MM-dd"); }

export function TeamLeaveCalendar({ companyId }: { companyId: Id<"companies"> | undefined }) {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>("month");
  const month = format(cursor, "yyyy-MM");
  const leaves = useQuery(api.leave.calendar, { month, companyId });
  const leavesByDay = useMemo(() => {
    const map = new Map<string, CalendarLeave[]>();
    if (!leaves) return map;
    for (const leave of leaves) {
      const start = new Date(leave.startDate + "T00:00:00"); const end = new Date(leave.endDate + "T00:00:00");
      const days = eachDayOfInterval({ start, end });
      for (const d of days) { const key = toIso(d); const arr = map.get(key) ?? []; arr.push(leave); map.set(key, arr); }
    }
    return map;
  }, [leaves]);
  const gridDays = useMemo(() => { const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }); const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }); return eachDayOfInterval({ start, end }); }, [cursor]);
  const sortedList = useMemo(() => { if (!leaves) return []; return [...leaves].sort((a, b) => a.startDate.localeCompare(b.startDate)); }, [leaves]);
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="size-4 text-primary" />Team Leave Calendar</CardTitle>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <Button size="sm" variant={view === "month" ? "default" : "ghost"} onClick={() => setView("month")} className={cn("h-7 px-2.5 text-xs", view !== "month" && "text-muted-foreground")}><LayoutGrid className="size-3.5" />Month</Button>
            <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")} className={cn("h-7 px-2.5 text-xs", view !== "list" && "text-muted-foreground")}><List className="size-3.5" />List</Button>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={() => setCursor((c) => subMonths(c, 1))}><ChevronLeft className="size-4" /></Button>
            <span className="min-w-[7rem] text-center text-sm font-medium">{format(cursor, "MMMM yyyy")}</span>
            <Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={() => setCursor((c) => addMonths(c, 1))}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {leaves === undefined ? (<Skeleton className="h-80 w-full" />) : view === "month" ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {gridDays.map((day) => {
                const key = toIso(day); const dayLeaves = leavesByDay.get(key) ?? []; const inMonth = isSameMonth(day, cursor);
                return (
                  <div key={key} className={cn("min-h-[76px] rounded-lg border p-1.5 text-left transition-colors", inMonth ? "bg-card" : "bg-muted/30 text-muted-foreground", isToday(day) && "border-primary ring-1 ring-primary/30")}>
                    <div className="mb-1 flex items-center justify-between"><span className={cn("text-xs font-medium", isToday(day) && "text-primary")}>{format(day, "d")}</span></div>
                    <div className="flex flex-col gap-0.5">
                      {dayLeaves.slice(0, 3).map((leave) => (<div key={leave._id} title={`${leave.employeeName} \u00b7 ${LEAVE_TYPE_LABELS[leave.leaveType]}`} className={cn("flex items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium text-white truncate", LEAVE_TYPE_DOT[leave.leaveType], leave.status === "pending" && "opacity-60")}><span className="truncate">{leave.employeeName.split(" ")[0]}</span></div>))}
                      {dayLeaves.length > 3 && <span className="px-1 text-[10px] text-muted-foreground">+{dayLeaves.length - 3} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : sortedList.length === 0 ? (
          <Empty><EmptyHeader><EmptyMedia variant="icon"><CalendarDays /></EmptyMedia><EmptyTitle>No leaves this month</EmptyTitle><EmptyDescription>Nobody is scheduled to be away in {format(cursor, "MMMM yyyy")}.</EmptyDescription></EmptyHeader></Empty>
        ) : (
          <div className="flex flex-col gap-2">{sortedList.map((leave) => (<div key={leave._id} className="flex items-center gap-3 rounded-lg border p-2.5"><Avatar className="size-9 shrink-0"><AvatarImage src={leave.employeePhoto ?? undefined} /><AvatarFallback className="text-xs">{leave.employeeName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{leave.employeeName}</p><p className="truncate text-xs text-muted-foreground">{format(new Date(leave.startDate + "T00:00:00"), "MMM d")}{" \u2192 "}{format(new Date(leave.endDate + "T00:00:00"), "MMM d, yyyy")}{" \u00b7 "}{leave.numberOfDays} day{leave.numberOfDays !== 1 ? "s" : ""}</p></div><span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", LEAVE_TYPE_BADGE[leave.leaveType])}>{LEAVE_TYPE_LABELS[leave.leaveType]}</span><LeaveStatusBadge status={leave.status} /></div>))}</div>
        )}
      </CardContent>
    </Card>
  );
}

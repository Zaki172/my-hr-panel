import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isWeekend, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { ScheduleCellDialog } from "./_components/schedule-cell-dialog.tsx";
import { cn } from "@/lib/utils.ts";

type ScheduleStatus = "office" | "remote" | "day_off" | "leave" | "holiday" | "business_trip";
type EmployeeRow = { _id: Id<"employees">; fullName: string; photoUrl?: string; position: string; departmentName: string | null };

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; bg: string; text: string; dot: string }> = {
  office: { label: "Office", bg: "bg-emerald-500/20 dark:bg-emerald-500/25", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  remote: { label: "Remote", bg: "bg-sky-500/20 dark:bg-sky-500/25", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500" },
  day_off: { label: "Day Off", bg: "bg-slate-400/15 dark:bg-slate-400/20", text: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400" },
  leave: { label: "Leave", bg: "bg-purple-500/20 dark:bg-purple-500/25", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
  holiday: { label: "Holiday", bg: "bg-amber-500/20 dark:bg-amber-500/25", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  business_trip: { label: "Business Trip", bg: "bg-orange-500/20 dark:bg-orange-500/25", text: "text-orange-700 dark:text-orange-300", dot: "bg-orange-500" },
};
const LEGEND = Object.entries(STATUS_CONFIG) as [ScheduleStatus, (typeof STATUS_CONFIG)[ScheduleStatus]][];

export default function Schedule() {
  return <Authenticated><ScheduleContent /></Authenticated>;
}

const ALL = "all";

function ScheduleContent() {
  const { selectedCompanyId, companies } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const isManager = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const [month, setMonth] = useState(new Date());
  const [deptFilter, setDeptFilter] = useState(ALL);
  const [empFilter, setEmpFilter] = useState(ALL);
  const monthStr = format(month, "yyyy-MM");
  const departments = useQuery(api.departments.list, selectedCompanyId ? { companyId: selectedCompanyId } : {});
  const allEmployees = useQuery(api.employees.list, { companyId: selectedCompanyId, departmentId: deptFilter !== ALL ? (deptFilter as Id<"departments">) : undefined });
  const scheduleData = useQuery(api.schedule.listByMonth, { month: monthStr, companyId: selectedCompanyId, departmentId: deptFilter !== ALL ? (deptFilter as Id<"departments">) : undefined, employeeId: empFilter !== ALL ? (empFilter as Id<"employees">) : undefined });
  const days = useMemo(() => { const start = startOfMonth(month); const end = endOfMonth(month); return eachDayOfInterval({ start, end }); }, [month]);
  const [dialogState, setDialogState] = useState<{ employeeId: Id<"employees">; employeeName: string; date: string; currentStatus?: ScheduleStatus; currentNote?: string } | null>(null);
  const handleCellClick = (employee: EmployeeRow, date: string, scheduleByKey: Record<string, { status: string; note?: string }>) => {
    if (!isManager) return;
    const key = `${employee._id}:${date}`; const entry = scheduleByKey[key];
    setDialogState({ employeeId: employee._id, employeeName: employee.fullName, date, currentStatus: entry?.status as ScheduleStatus | undefined, currentNote: entry?.note });
  };
  const filteredEmployees = useMemo(() => { const employees = (scheduleData?.employees ?? []) as EmployeeRow[]; if (empFilter !== ALL) return employees.filter((e) => e._id === empFilter); return employees; }, [scheduleData?.employees, empFilter]);
  const holidayDates = useMemo(() => { const set = new Set<string>(); for (const h of scheduleData?.holidays ?? []) set.add(h.date); return set; }, [scheduleData?.holidays]);
  const holidayNames = useMemo(() => { const map: Record<string, string> = {}; for (const h of scheduleData?.holidays ?? []) map[h.date] = h.name; return map; }, [scheduleData?.holidays]);
  return (
    <TooltipProvider>
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h1 className="font-serif text-2xl font-bold tracking-tight">Team Schedule</h1><p className="text-sm text-muted-foreground">Monthly work schedule view across the team.</p></div>
          <div className="flex items-center gap-1"><Button size="icon" variant="ghost" className="size-8 cursor-pointer" onClick={() => setMonth((m) => subMonths(m, 1))}><ChevronLeft className="size-4" /></Button><span className="min-w-[9rem] text-center text-sm font-semibold">{format(month, "MMMM yyyy")}</span><Button size="icon" variant="ghost" className="size-8 cursor-pointer" onClick={() => setMonth((m) => addMonths(m, 1))}><ChevronRight className="size-4" /></Button></div>
        </div>
        <Card><CardContent className="flex flex-wrap items-center gap-3">
          <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setEmpFilter(ALL); }}><SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Departments" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All Departments</SelectItem>{departments?.map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Select value={empFilter} onValueChange={setEmpFilter}><SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="All Employees" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All Employees</SelectItem>{allEmployees?.map((e) => <SelectItem key={e._id} value={e._id}>{e.fullName}</SelectItem>)}</SelectContent></Select>
          {companies && companies.length > 0 && <div className="flex flex-wrap items-center gap-2">{companies.map((c) => <Badge key={c._id} variant="outline" className="text-xs">{c.name}</Badge>)}</div>}
        </CardContent></Card>
        <div className="flex flex-wrap items-center gap-3">
          {LEGEND.map(([status, cfg]) => (<div key={status} className="flex items-center gap-1.5"><span className={cn("size-2.5 rounded-full", cfg.dot)} /><span className="text-xs text-muted-foreground">{cfg.label}</span></div>))}
          <div className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground/30" /><span className="text-xs text-muted-foreground">Unscheduled</span></div>
        </div>
        {scheduleData === undefined ? (<div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>)
          : filteredEmployees.length === 0 ? (<Empty><EmptyHeader><EmptyMedia variant="icon"><CalendarRange /></EmptyMedia><EmptyTitle>No employees found</EmptyTitle><EmptyDescription>Adjust your filters to view the team schedule.</EmptyDescription></EmptyHeader></Empty>)
          : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="min-w-full text-sm border-collapse">
                <thead><tr className="bg-muted/50">
                  <th className="sticky left-0 z-10 bg-muted/50 min-w-[180px] w-[180px] border-r border-border px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Employee</th>
                  {days.map((day) => { const dateStr = format(day, "yyyy-MM-dd"); const isHoliday = holidayDates.has(dateStr); const isWknd = isWeekend(day); const isNow = isToday(day); return (<th key={dateStr} className={cn("min-w-[36px] w-[36px] border-r border-border px-0.5 py-1.5 text-center", isWknd && "bg-muted/70", isHoliday && "bg-amber-500/10", isNow && "bg-primary/10")}><div className="flex flex-col items-center gap-0.5"><span className={cn("text-[9px] font-medium uppercase text-muted-foreground", isNow && "text-primary")}>{format(day, "EEE").slice(0, 2)}</span><span className={cn("text-[11px] font-bold leading-none", isNow ? "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground" : isWknd ? "text-muted-foreground" : "text-foreground")}>{format(day, "d")}</span>{isHoliday && (<Tooltip><TooltipTrigger><span className="size-1.5 rounded-full bg-amber-500 block" /></TooltipTrigger><TooltipContent><p>{holidayNames[dateStr]}</p></TooltipContent></Tooltip>)}</div></th>); })}
                </tr></thead>
                <tbody>{filteredEmployees.map((emp) => <EmployeeScheduleRow key={emp._id} employee={emp} days={days} scheduleByKey={scheduleData.scheduleByKey} holidayDates={holidayDates} isManager={isManager} onCellClick={(date) => handleCellClick(emp, date, scheduleData.scheduleByKey)} />)}</tbody>
              </table>
            </div>
          )}
        {filteredEmployees.length > 0 && scheduleData && <ScheduleSummary employees={filteredEmployees} days={days} scheduleByKey={scheduleData.scheduleByKey} holidayDates={holidayDates} />}
      </div>
      {dialogState && <ScheduleCellDialog open={dialogState !== null} onOpenChange={(open) => !open && setDialogState(null)} employeeId={dialogState.employeeId} employeeName={dialogState.employeeName} date={dialogState.date} currentStatus={dialogState.currentStatus} currentNote={dialogState.currentNote} />}
    </TooltipProvider>
  );
}

function EmployeeScheduleRow({ employee, days, scheduleByKey, holidayDates, isManager, onCellClick }: { employee: EmployeeRow; days: Date[]; scheduleByKey: Record<string, { status: string; note?: string }>; holidayDates: Set<string>; isManager: boolean; onCellClick: (date: string) => void }) {
  return (
    <tr className="border-t border-border hover:bg-muted/30 transition-colors">
      <td className="sticky left-0 z-10 bg-background border-r border-border px-3 py-2"><div className="flex items-center gap-2"><Avatar className="size-7 shrink-0"><AvatarImage src={employee.photoUrl} /><AvatarFallback className="text-[10px]">{employee.fullName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="flex flex-col leading-tight min-w-0"><span className="text-xs font-semibold truncate">{employee.fullName}</span>{employee.departmentName && <span className="text-[10px] text-muted-foreground truncate">{employee.departmentName}</span>}</div></div></td>
      {days.map((day) => { const dateStr = format(day, "yyyy-MM-dd"); const isWknd = isWeekend(day); const isHoliday = holidayDates.has(dateStr); const key = `${employee._id}:${dateStr}`; const entry = scheduleByKey[key]; const status = entry?.status as ScheduleStatus | undefined; const cfg = status ? STATUS_CONFIG[status] : null; return (<td key={dateStr} onClick={() => onCellClick(dateStr)} className={cn("border-r border-border p-[2px]", isWknd && "bg-muted/30", isHoliday && !status && "bg-amber-500/5", isManager && "cursor-pointer")}><Tooltip><TooltipTrigger asChild><div className={cn("flex h-7 w-full items-center justify-center rounded-md text-[9px] font-bold transition-opacity", cfg ? `${cfg.bg} ${cfg.text}` : "text-transparent", isManager && !cfg && "hover:bg-muted", isManager && cfg && "hover:opacity-80")}>{cfg ? (status === "office" ? "OF" : status === "remote" ? "RM" : status === "day_off" ? "DO" : status === "leave" ? "LV" : status === "holiday" ? "HD" : "BT") : isManager ? "+" : ""}</div></TooltipTrigger>{(cfg || entry?.note) && <TooltipContent><p className="font-medium">{cfg?.label ?? "\u2014"}</p>{entry?.note && <p className="text-xs text-muted-foreground">{entry.note}</p>}</TooltipContent>}</Tooltip></td>); }}
    </tr>
  );
}

function ScheduleSummary({ employees, days, scheduleByKey, holidayDates }: { employees: EmployeeRow[]; days: Date[]; scheduleByKey: Record<string, { status: string; note?: string }>; holidayDates: Set<string> }) {
  const counts = useMemo(() => {
    const result: Record<ScheduleStatus | "unscheduled", number> = { office: 0, remote: 0, day_off: 0, leave: 0, holiday: 0, business_trip: 0, unscheduled: 0 };
    for (const emp of employees) { for (const day of days) { if (isWeekend(day)) continue; const dateStr = format(day, "yyyy-MM-dd"); const key = `${emp._id}:${dateStr}`; const entry = scheduleByKey[key]; if (entry) { const s = entry.status as ScheduleStatus; result[s] = (result[s] ?? 0) + 1; } else if (!holidayDates.has(dateStr)) result.unscheduled++; } }
    return result;
  }, [employees, days, scheduleByKey, holidayDates]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <Card><CardContent>
      <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month Summary (Weekdays)</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {(Object.entries(STATUS_CONFIG) as [ScheduleStatus, (typeof STATUS_CONFIG)[ScheduleStatus]][]).map(([status, cfg]) => (<div key={status} className={cn("flex flex-col items-center gap-1 rounded-lg p-3", cfg.bg)}><span className={cn("text-2xl font-bold", cfg.text)}>{counts[status] ?? 0}</span><span className={cn("text-[11px] font-medium", cfg.text)}>{cfg.label}</span></div>))}
        <div className="flex flex-col items-center gap-1 rounded-lg bg-muted p-3"><span className="text-2xl font-bold text-muted-foreground">{counts.unscheduled}</span><span className="text-[11px] font-medium text-muted-foreground">Unscheduled</span></div>
      </div>
      {total > 0 && <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">{(Object.entries(STATUS_CONFIG) as [ScheduleStatus, (typeof STATUS_CONFIG)[ScheduleStatus]][]).map(([status, cfg]) => { const pct = ((counts[status] ?? 0) / total) * 100; return pct > 0 ? <div key={status} className={cn(cfg.dot)} style={{ width: `${pct}%` }} title={`${cfg.label}: ${counts[status]}`} /> : null; })}</div>}
    </CardContent></Card>
  );
}

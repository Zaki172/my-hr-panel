import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { format, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, LogIn, LogOut, CalendarDays, Download } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import Papa from "papaparse";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { AttendanceStatusBadge } from "@/components/status-badges.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { MarkAttendanceDialog, type AttendanceMarkRow } from "./_components/mark-attendance-dialog.tsx";
import { AttendanceAnalytics } from "./_components/attendance-analytics.tsx";
import { cn } from "@/lib/utils.ts";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStr(date: Date) { return format(date, "yyyy-MM"); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

type AttendanceRowData = { employee: { _id: Id<"employees">; fullName: string; employeeCode: string; position: string; photoUrl?: string; departmentName: string; workMode: string }; record: AttendanceMarkRow["record"] };

export default function Attendance() {
  return <Authenticated><AttendanceContent /></Authenticated>;
}

const STATUS_COLORS: Record<string, string> = { present: "bg-emerald-500", remote: "bg-sky-500", late: "bg-amber-500", absent: "bg-red-500", leave: "bg-purple-500", half_day: "bg-orange-500" };

function AttendanceContent() {
  const { selectedCompanyId } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const canManage = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const isEmployee = !canManage && !!me?.employee;
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [chartMonth, setChartMonth] = useState(new Date());
  const [markRow, setMarkRow] = useState<AttendanceMarkRow | null>(null);
  const [markOpen, setMarkOpen] = useState(false);
  const checkIn = useMutation(api.attendance.checkIn);
  const checkOut = useMutation(api.attendance.checkOut);
  const [workModeForCheckIn, setWorkModeForCheckIn] = useState<"office" | "remote" | "hybrid">("office");
  const [actionLoading, setActionLoading] = useState(false);
  const rows = useQuery(api.attendance.listByDate, { date: selectedDate, companyId: selectedCompanyId }) as AttendanceRowData[] | undefined;
  const stats = useQuery(api.attendance.statsByDate, { date: selectedDate, companyId: selectedCompanyId });
  const monthly = useQuery(api.attendance.monthlyStats, { companyId: selectedCompanyId, month: monthStr(chartMonth) });
  const myRecord = isEmployee ? rows?.find((r) => r.employee._id === me?.employee?._id)?.record ?? null : null;

  async function handleCheckIn() {
    setActionLoading(true);
    try { await checkIn({ workMode: workModeForCheckIn }); toast.success("Checked in successfully!"); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Check-in failed"); }
    finally { setActionLoading(false); }
  }
  async function handleCheckOut() {
    setActionLoading(true);
    try { await checkOut({}); toast.success("Checked out successfully!"); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Check-out failed"); }
    finally { setActionLoading(false); }
  }

  const totalRows = rows?.length ?? 0;
  const presentCount = (stats?.present ?? 0) + (stats?.remote ?? 0);

  function handleExport() {
    if (!rows || rows.length === 0) { toast.error("No attendance data to export"); return; }
    const exportRows = rows.map((row) => ({ "Employee Code": row.employee.employeeCode, Name: row.employee.fullName, Position: row.employee.position, Department: row.employee.departmentName, Status: row.record?.status ?? "not_marked", "Check In": row.record?.checkInAt ? fmtTime(row.record.checkInAt as string) : "", "Check Out": row.record?.checkOutAt ? fmtTime(row.record.checkOutAt as string) : "", "Working Hours": typeof row.record?.workingHours === "number" ? row.record.workingHours : "", "Work Mode": row.record?.workMode ?? row.employee.workMode, Late: row.record?.isLate === true ? "Yes" : "No" }));
    const csv = "\uFEFF" + Papa.unparse(exportRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `attendance-${selectedDate}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    toast.success("Attendance exported");
  }

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1"><h1 className="font-serif text-2xl font-bold tracking-tight">Attendance</h1><p className="text-sm text-muted-foreground">Track daily team presence, check-in / check-out times and working hours.</p></div>
        {canManage && <Button variant="secondary" className="cursor-pointer" onClick={handleExport}><Download className="size-4" />Export CSV</Button>}
      </div>
      {isEmployee && selectedDate === todayStr() && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="font-medium">{myRecord?.checkInAt ? myRecord.checkOutAt ? "You've checked out for today" : "You're checked in" : "You haven't checked in yet today"}</p>
              {myRecord?.checkInAt && <p className="text-sm text-muted-foreground">In: {fmtTime(myRecord.checkInAt as string)}{typeof myRecord.checkOutAt === "string" && ` \u00b7 Out: ${fmtTime(myRecord.checkOutAt)}`}{typeof myRecord.workingHours === "number" && ` \u00b7 ${myRecord.workingHours}h worked`}</p>}
            </div>
            <div className="flex items-center gap-2">
              {!myRecord?.checkInAt && (<><Select value={workModeForCheckIn} onValueChange={(v) => setWorkModeForCheckIn(v as typeof workModeForCheckIn)}><SelectTrigger className="w-32 cursor-pointer"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="office">Office</SelectItem><SelectItem value="remote">Remote</SelectItem><SelectItem value="hybrid">Hybrid</SelectItem></SelectContent></Select><Button className="cursor-pointer" onClick={handleCheckIn} disabled={actionLoading}><LogIn className="size-4" />Check In</Button></>)}
              {myRecord?.checkInAt && !myRecord.checkOutAt && <Button variant="secondary" className="cursor-pointer" onClick={handleCheckOut} disabled={actionLoading}><LogOut className="size-4" />Check Out</Button>}
              {myRecord?.checkOutAt && <AttendanceStatusBadge status={myRecord.status as string} />}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(["present", "remote", "late", "absent", "leave", "half_day"] as const).map((key) => (<Card key={key}><CardContent className="flex flex-col gap-1"><div className="flex items-center gap-2"><span className={cn("size-2 rounded-full", STATUS_COLORS[key])} /><span className="text-xs text-muted-foreground capitalize">{key === "half_day" ? "Half Day" : key === "leave" ? "On Leave" : key.charAt(0).toUpperCase() + key.slice(1)}</span></div><p className="text-2xl font-bold">{stats === undefined ? "\u2014" : (stats[key as keyof typeof stats] ?? 0)}</p></CardContent></Card>))}
      </div>
      <AttendanceAnalytics date={selectedDate} companyId={selectedCompanyId} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Monthly Attendance Rate</CardTitle>
            <div className="flex items-center gap-1"><Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={() => setChartMonth((m) => subMonths(m, 1))}><ChevronLeft className="size-4" /></Button><span className="min-w-[7rem] text-center text-sm font-medium">{format(chartMonth, "MMMM yyyy")}</span><Button size="icon" variant="ghost" className="size-7 cursor-pointer" onClick={() => setChartMonth((m) => addMonths(m, 1))}><ChevronRight className="size-4" /></Button></div>
          </CardHeader>
          <CardContent>{monthly === undefined ? <Skeleton className="h-32 w-full" /> : monthly.days.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No attendance data for this month.</p> : <AttendanceChart days={monthly.days} />}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Browse Date</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} max={todayStr()} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
            <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total employees</span><span className="font-medium">{totalRows}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Present / Remote</span><span className="font-medium text-emerald-600 dark:text-emerald-400">{presentCount}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Absent</span><span className="font-medium text-red-600 dark:text-red-400">{stats?.absent ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">On Leave</span><span className="font-medium text-purple-600 dark:text-purple-400">{stats?.leave ?? 0}</span></div>
              <div className="flex justify-between pt-1 font-semibold border-t mt-1"><span>Attendance rate</span><span>{totalRows > 0 ? `${Math.round((presentCount / totalRows) * 100)}%` : "\u2014"}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="size-4" />Team Presence \u2014 {format(new Date(selectedDate + "T00:00:00"), "EEEE, d MMMM yyyy")}</CardTitle>
          <Badge variant="secondary">{totalRows} employees</Badge>
        </CardHeader>
        <CardContent>
          {rows === undefined ? (<div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>)
            : rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No employees found.</p>
            : (<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="pb-2 pr-4 font-medium">Employee</th><th className="pb-2 pr-4 font-medium hidden md:table-cell">Department</th><th className="pb-2 pr-4 font-medium">Status</th><th className="pb-2 pr-4 font-medium hidden sm:table-cell">Check In</th><th className="pb-2 pr-4 font-medium hidden sm:table-cell">Check Out</th><th className="pb-2 pr-4 font-medium hidden lg:table-cell">Hours</th><th className="pb-2 pr-4 font-medium hidden lg:table-cell">Mode</th>{canManage && <th className="pb-2 font-medium w-16 text-right">Action</th>}</tr></thead><tbody className="divide-y">{rows.map((row) => <AttendanceTableRow key={row.employee._id} row={row} canManage={canManage} onMark={() => { setMarkRow(row); setMarkOpen(true); }} />)}</tbody></table></div>)}
        </CardContent>
      </Card>
      <MarkAttendanceDialog row={markRow} date={selectedDate} open={markOpen} onOpenChange={(open) => { setMarkOpen(open); if (!open) setMarkRow(null); }} />
    </div>
  );
}

function AttendanceTableRow({ row, canManage, onMark }: { row: AttendanceRowData; canManage: boolean; onMark: () => void }) {
  const { employee, record } = row;
  const status = record?.status ?? "not_marked";
  return (
    <tr>
      <td className="py-2.5 pr-4"><div className="flex items-center gap-2.5"><Avatar className="size-8"><AvatarImage src={employee.photoUrl} /><AvatarFallback className="text-xs">{employee.fullName.charAt(0)}</AvatarFallback></Avatar><div className="flex flex-col leading-tight"><span className="font-medium">{employee.fullName}</span><span className="text-xs text-muted-foreground">{employee.employeeCode}</span></div></div></td>
      <td className="py-2.5 pr-4 text-muted-foreground hidden md:table-cell">{employee.departmentName}</td>
      <td className="py-2.5 pr-4"><div className="flex items-center gap-1.5"><AttendanceStatusBadge status={status as string} />{record?.isLate === true && <span className="text-[10px] text-amber-500 font-medium">Late</span>}</div></td>
      <td className="py-2.5 pr-4 text-muted-foreground hidden sm:table-cell">{record?.checkInAt ? <span className="flex items-center gap-1"><Clock className="size-3 shrink-0" />{fmtTime(record.checkInAt as string)}</span> : "\u2014"}</td>
      <td className="py-2.5 pr-4 text-muted-foreground hidden sm:table-cell">{record?.checkOutAt ? <span className="flex items-center gap-1"><Clock className="size-3 shrink-0" />{fmtTime(record.checkOutAt as string)}</span> : "\u2014"}</td>
      <td className="py-2.5 pr-4 hidden lg:table-cell">{typeof record?.workingHours === "number" ? <span className="font-medium">{record.workingHours}h</span> : "\u2014"}{typeof record?.overtimeHours === "number" && <span className="ml-1 text-xs text-emerald-600 dark:text-emerald-400">+{record.overtimeHours}OT</span>}</td>
      <td className="py-2.5 pr-4 text-muted-foreground hidden lg:table-cell capitalize">{record?.workMode as string ?? "\u2014"}</td>
      {canManage && <td className="py-2.5 text-right"><Button size="sm" variant="ghost" className="cursor-pointer h-7 text-xs" onClick={onMark}>{record ? "Edit" : "Mark"}</Button></td>}
    </tr>
  );
}

type DayStats = { date: string; present: number; remote: number; absent: number; leave: number; total: number; rate: number };

function AttendanceChart({ days }: { days: DayStats[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end gap-[2px] h-28">
        {days.map((d) => (<div key={d.date} className="group relative flex flex-1 flex-col items-center justify-end" title={`${format(new Date(d.date + "T00:00:00"), "d MMM")} \u00b7 ${d.rate}% (${d.present + d.remote}/${d.total})`}><div className="w-full min-h-[2px] rounded-t-sm bg-primary/70 transition-all group-hover:bg-primary" style={{ height: `${Math.max(2, (d.rate / 100) * 112)}px` }} /></div>))}
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground"><span>{format(new Date(days[0].date + "T00:00:00"), "d MMM")}</span><span className="font-medium">Avg {Math.round(days.reduce((s, d) => s + d.rate, 0) / days.length)}%</span><span>{format(new Date(days[days.length - 1].date + "T00:00:00"), "d MMM")}</span></div>
    </div>
  );
}

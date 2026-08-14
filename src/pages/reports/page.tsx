import { useState } from "react";
import { useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { format, subMonths } from "date-fns";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Users, TrendingUp, CalendarOff, ClipboardList, Activity, ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

const STATUS_COLORS: Record<string, string> = { present: "#10b981", late: "#f59e0b", remote: "#6366f1", leave: "#8b5cf6", absent: "#ef4444", half_day: "#3b82f6" };
const PERF_COLORS = ["#10b981", "#6366f1", "#f59e0b", "#ef4444"];
const CATEGORY_LABELS: Record<string, string> = { attendanceScore: "Attendance", taskCompletionScore: "Task Completion", workQualityScore: "Work Quality", communicationScore: "Communication", teamworkScore: "Teamwork", responsibilityScore: "Responsibility", productivityScore: "Productivity", deadlineManagementScore: "Deadline Mgmt" };
const LEAVE_TYPE_LABELS: Record<string, string> = { annual: "Annual", sick: "Sick", casual: "Casual", emergency: "Emergency", unpaid: "Unpaid" };
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function monthLabel(yyyyMM: string) { const [, m] = yyyyMM.split("-"); return MONTH_LABELS[parseInt(m, 10) - 1] ?? yyyyMM; }

export default function ReportsPage() {
  return <Authenticated><ReportsContent /></Authenticated>;
}

function ReportsContent() {
  const { selectedCompanyId } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const isManager = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const now = new Date();
  const [attendanceMonth, setAttendanceMonth] = useState(format(now, "yyyy-MM"));
  const [leaveYear, setLeaveYear] = useState(now.getFullYear());
  const monthOptions = Array.from({ length: 12 }, (_, i) => { const d = subMonths(now, i); return { value: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") }; });
  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
  if (!isManager) return (<div className="flex min-h-[60vh] items-center justify-center"><Empty><EmptyHeader><EmptyMedia variant="icon"><TrendingUp /></EmptyMedia><EmptyTitle>Access Restricted</EmptyTitle><EmptyDescription>Reports are only available to managers and HR admins.</EmptyDescription></EmptyHeader></Empty></div>);
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div><h1 className="font-serif text-2xl font-bold tracking-tight">Reports & Analytics</h1><p className="text-sm text-muted-foreground">Company-wide insights across headcount, attendance, leave, and performance.</p></div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview"><Users className="size-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="attendance"><Activity className="size-3.5" /> Attendance</TabsTrigger>
          <TabsTrigger value="leave"><CalendarOff className="size-3.5" /> Leave</TabsTrigger>
          <TabsTrigger value="performance"><TrendingUp className="size-3.5" /> Performance</TabsTrigger>
          <TabsTrigger value="activity"><ClipboardList className="size-3.5" /> Activity Log</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4 flex flex-col gap-4"><OverviewTab companyId={selectedCompanyId} /></TabsContent>
        <TabsContent value="attendance" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-3"><Select value={attendanceMonth} onValueChange={setAttendanceMonth}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{monthOptions.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent></Select></div>
          <AttendanceReportTab companyId={selectedCompanyId} month={attendanceMonth} />
        </TabsContent>
        <TabsContent value="leave" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-3"><Select value={String(leaveYear)} onValueChange={(v) => setLeaveYear(Number(v))}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent></Select></div>
          <LeaveTab companyId={selectedCompanyId} year={leaveYear} />
        </TabsContent>
        <TabsContent value="performance" className="mt-4 flex flex-col gap-4"><PerformanceTab companyId={selectedCompanyId} /></TabsContent>
        <TabsContent value="activity" className="mt-4 flex flex-col gap-4"><ActivityLogTab companyId={selectedCompanyId} /></TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ companyId }: { companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"] }) {
  const data = useQuery(api.reports.headcountOverview, { companyId });
  if (!data) return <ReportSkeleton />;
  const statusData = Object.entries(data.byStatus).map(([k, v]) => ({ name: k.replace("_", " "), value: v }));
  const workModeData = Object.entries(data.byWorkMode).map(([k, v]) => ({ name: k, value: v }));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Employees" value={data.total} icon={<Users className="size-5 text-primary" />} />
        <StatCard label="Active" value={data.byStatus.active ?? 0} icon={<Activity className="size-5 text-emerald-500" />} />
        <StatCard label="On Leave" value={data.byStatus.on_leave ?? 0} icon={<CalendarOff className="size-5 text-amber-500" />} />
        <StatCard label="New This Month" value={data.monthlyJoining[data.monthlyJoining.length - 1]?.count ?? 0} icon={<TrendingUp className="size-5 text-purple-500" />} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Monthly Joining Trend</CardTitle><CardDescription>New hires over the last 12 months</CardDescription></CardHeader><CardContent><ResponsiveContainer width="100%" height={220}><BarChart data={data.monthlyJoining.map((d) => ({ ...d, month: monthLabel(d.month) }))}><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} name="New Hires" /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Headcount by Department</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-2">{data.byDepartment.slice(0, 8).map((d) => (<div key={d.name} className="flex items-center gap-3"><span className="w-28 shrink-0 truncate text-sm text-muted-foreground">{d.name}</span><Progress value={data.total > 0 ? (d.count / data.total) * 100 : 0} className="h-2 flex-1" /><span className="w-8 text-right text-sm font-medium">{d.count}</span></div>))}{data.byDepartment.length === 0 && <p className="text-sm text-muted-foreground">No departments found.</p>}</div></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Employee Status</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name} (${value})` : ""}>{statusData.map((_, i) => <Cell key={i} fill={["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6"][i % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Work Mode Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={200}><PieChart><Pie data={workModeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => value > 0 ? `${name} (${value})` : ""}>{workModeData.map((_, i) => <Cell key={i} fill={["#6366f1","#10b981","#f59e0b"][i % 3]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></CardContent></Card>
      </div>
    </>
  );
}

function AttendanceReportTab({ companyId, month }: { companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"]; month: string }) {
  const data = useQuery(api.reports.attendanceSummary, { companyId, month });
  if (!data) return <ReportSkeleton />;
  const statusData = Object.entries(data.counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: k.replace("_", " "), value: v, fill: STATUS_COLORS[k] }));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Records" value={data.totalRecords} />
        <StatCard label="Present Days" value={data.counts.present ?? 0} color="text-emerald-500" />
        <StatCard label="Late Arrivals" value={data.lateCount} color="text-amber-500" />
        <StatCard label="Absences" value={data.counts.absent ?? 0} color="text-destructive" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Daily Presence \u2014 {monthLabel(month)}</CardTitle></CardHeader><CardContent>{data.dailyPresence.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No attendance data for this month.</p> : <ResponsiveContainer width="100%" height={220}><LineChart data={data.dailyPresence.map((d) => ({ ...d, day: d.date.slice(8) }))}><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={2} dot={false} name="Present" /></LineChart></ResponsiveContainer>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Status Breakdown</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={220}><BarChart data={statusData} layout="vertical"><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} /><Tooltip /><Bar dataKey="value" radius={[0, 4, 4, 0]} name="Count">{statusData.map((entry, i) => <Cell key={i} fill={entry.fill ?? "var(--primary)"} />)}</Bar></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
      {data.topAbsentees.some((e) => e.absentDays > 0) && (<Card><CardHeader><CardTitle className="text-base">Top Absentees</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-2">{data.topAbsentees.filter((e) => e.absentDays > 0).slice(0, 6).map((e) => (<div key={e.employeeId} className="flex items-center gap-3"><Avatar className="size-8"><AvatarImage src={e.photoUrl ?? undefined} /><AvatarFallback className="text-xs">{e.fullName.charAt(0)}</AvatarFallback></Avatar><span className="flex-1 text-sm">{e.fullName}</span><Badge variant="outline" className="gap-1 text-destructive border-destructive/30">{e.absentDays} absent</Badge>{e.lateDays > 0 && <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">{e.lateDays} late</Badge>}</div>))}</div></CardContent></Card>)}
    </>
  );
}

function LeaveTab({ companyId, year }: { companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"]; year: number }) {
  const data = useQuery(api.reports.leaveSummary, { companyId, year });
  if (!data) return <ReportSkeleton />;
  const typeData = Object.entries(data.byType).map(([k, v]) => ({ name: LEAVE_TYPE_LABELS[k] ?? k, value: v }));
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Requests" value={data.totalRequests} />
        <StatCard label="Approved" value={data.byStatus.approved ?? 0} color="text-emerald-500" />
        <StatCard label="Pending" value={data.byStatus.pending ?? 0} color="text-amber-500" />
        <StatCard label="Rejected" value={data.byStatus.rejected ?? 0} color="text-destructive" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Approved Leave Days \u2014 {year}</CardTitle></CardHeader><CardContent>{data.monthlyLeave.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No approved leave this year.</p> : <ResponsiveContainer width="100%" height={220}><BarChart data={data.monthlyLeave.map((d) => ({ ...d, month: monthLabel(d.month) }))}><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} allowDecimals={false} /><Tooltip /><Bar dataKey="days" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Days" /></BarChart></ResponsiveContainer>}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Days by Leave Type</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-2 pt-2">{typeData.map((d) => { const total = typeData.reduce((s, t) => s + t.value, 0); const pct = total > 0 ? (d.value / total) * 100 : 0; return (<div key={d.name} className="flex items-center gap-3"><span className="w-24 shrink-0 text-sm text-muted-foreground">{d.name}</span><Progress value={pct} className="h-2 flex-1" /><span className="w-10 text-right text-sm font-medium">{d.value}d</span></div>); })}</div></CardContent></Card>
      </div>
      {data.topLeaves.some((e) => e.totalDays > 0) && (<Card><CardHeader><CardTitle className="text-base">Top Leave Takers</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-2">{data.topLeaves.filter((e) => e.totalDays > 0).slice(0, 8).map((e) => (<div key={e.employeeId} className="flex items-center gap-3"><Avatar className="size-8"><AvatarImage src={e.photoUrl ?? undefined} /><AvatarFallback className="text-xs">{e.fullName.charAt(0)}</AvatarFallback></Avatar><span className="flex-1 text-sm">{e.fullName}</span><Badge variant="secondary">{e.totalDays} days / {e.count} request{e.count !== 1 ? "s" : ""}</Badge></div>))}</div></CardContent></Card>)}
    </>
  );
}

function PerformanceTab({ companyId }: { companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"] }) {
  const data = useQuery(api.reports.performanceSummary, { companyId });
  if (!data) return <ReportSkeleton />;
  if (data.totalReviews === 0) return (<Empty><EmptyHeader><EmptyMedia variant="icon"><TrendingUp /></EmptyMedia><EmptyTitle>No performance reviews yet</EmptyTitle><EmptyDescription>Start adding performance reviews in the Performance section.</EmptyDescription></EmptyHeader></Empty>);
  const distData = [{ name: "Excellent (4.5+)", value: data.distribution.excellent }, { name: "Good (3.5+)", value: data.distribution.good }, { name: "Average (2.5+)", value: data.distribution.average }, { name: "Poor (<2.5)", value: data.distribution.poor }].filter((d) => d.value > 0);
  const categoryData = Object.entries(data.byCategory).map(([k, v]) => ({ name: CATEGORY_LABELS[k] ?? k, score: Math.round(v * 10) / 10 })).sort((a, b) => b.score - a.score);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Reviews" value={data.totalReviews} />
        <StatCard label="Avg Score" value={`${Math.round(data.avgOverallScore * 10) / 10} / 5`} />
        <StatCard label="Excellent" value={data.distribution.excellent} color="text-emerald-500" />
        <StatCard label="Need Improvement" value={data.distribution.poor} color="text-destructive" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Score Distribution</CardTitle></CardHeader><CardContent><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={distData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ value }) => `${value}`}>{distData.map((_, i) => <Cell key={i} fill={PERF_COLORS[i % PERF_COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Average by Category</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-2 pt-1">{categoryData.map((d) => (<div key={d.name} className="flex items-center gap-3"><span className="w-32 shrink-0 text-xs text-muted-foreground">{d.name}</span><Progress value={(d.score / 5) * 100} className="h-2 flex-1" /><span className="w-8 text-right text-sm font-medium">{d.score}</span></div>))}</div></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">Top Performers</CardTitle></CardHeader><CardContent><div className="flex flex-col gap-2">{data.topPerformers.map((e, i) => (<div key={e.employeeId} className="flex items-center gap-3"><span className="w-5 text-center text-sm font-bold text-muted-foreground">#{i + 1}</span><Avatar className="size-8"><AvatarImage src={e.photoUrl ?? undefined} /><AvatarFallback className="text-xs">{e.fullName.charAt(0)}</AvatarFallback></Avatar><span className="flex-1 text-sm">{e.fullName}</span><Badge variant="secondary">{e.periodLabel}</Badge><span className={`text-sm font-bold ${e.overallScore >= 4.5 ? "text-emerald-500" : e.overallScore >= 3.5 ? "text-primary" : "text-amber-500"}`}>{Math.round(e.overallScore * 10) / 10}</span></div>))}</div></CardContent></Card>
    </>
  );
}

const ACTION_COLORS: Record<string, string> = { check_in: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", check_out: "bg-sky-500/15 text-sky-700 dark:text-sky-300", leave_submitted: "bg-amber-500/15 text-amber-700 dark:text-amber-300", leave_approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300", leave_rejected: "bg-red-500/15 text-red-700 dark:text-red-300", employee_created: "bg-purple-500/15 text-purple-700 dark:text-purple-300", employee_updated: "bg-blue-500/15 text-blue-700 dark:text-blue-300", employee_deleted: "bg-red-500/15 text-red-700 dark:text-red-300", document_uploaded: "bg-teal-500/15 text-teal-700 dark:text-teal-300", announcement_created: "bg-violet-500/15 text-violet-700 dark:text-violet-300" };

function ActivityLogTab({ companyId }: { companyId: ReturnType<typeof useCompanyFilter>["selectedCompanyId"] }) {
  const logs = useQuery(api.reports.listActivity, { companyId, limit: 100 });
  if (!logs) return <ReportSkeleton rows={8} />;
  if (logs.length === 0) return (<Empty><EmptyHeader><EmptyMedia variant="icon"><ClipboardList /></EmptyMedia><EmptyTitle>No activity recorded yet</EmptyTitle><EmptyDescription>Activity will appear here as events occur in the system.</EmptyDescription></EmptyHeader></Empty>);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent Activity</CardTitle><CardDescription>Last {logs.length} events across the system</CardDescription></CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y">{logs.map((log) => (<div key={log._id} className="flex items-start gap-3 py-3"><div className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-muted text-muted-foreground"}`}>{log.action.replace(/_/g, " ")}</div><div className="flex min-w-0 flex-1 flex-col gap-0.5"><p className="text-sm leading-snug">{log.description}</p>{log.employeeName && <p className="text-xs text-muted-foreground">by {log.employeeName}</p>}</div><span className="shrink-0 text-xs text-muted-foreground">{format(new Date(log._creationTime), "MMM d, HH:mm")}</span></div>))}</div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon?: React.ReactNode; color?: string }) {
  return (<Card><CardContent className="flex items-center gap-3">{icon}<div><p className={`text-2xl font-bold ${color ?? ""}`}>{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></CardContent></Card>);
}

function ReportSkeleton({ rows = 3 }: { rows?: number }) {
  return (<div className="flex flex-col gap-3"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-56 w-full" />)}</div>);
}

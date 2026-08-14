import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentActor, requireRole, MANAGER_ROLES } from "./lib/auth";
import type { Id } from "./_generated/dataModel.d.ts";

export const listActivity = query({
  args: { companyId: v.optional(v.id("companies")), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const limit = args.limit ?? 100;
    const all = await ctx.db.query("activityLogs").order("desc").take(500);
    const filtered = args.companyId ? all.filter((a) => a.companyId === args.companyId || a.companyId === undefined) : all;
    const rows = filtered.slice(0, limit);
    return Promise.all(rows.map(async (row) => { const emp = row.employeeId ? await ctx.db.get(row.employeeId) : null; return { ...row, employeeName: emp?.fullName ?? null, employeePhoto: emp?.photoUrl ?? null }; }));
  },
});

export const attendanceSummary = query({
  args: { companyId: v.optional(v.id("companies")), month: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const all = await ctx.db.query("attendance").collect();
    const records = all.filter((r) => r.date.startsWith(args.month) && (args.companyId ? r.companyId === args.companyId : true));
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees;
    const activeCount = employees.filter((e) => e.status !== "resigned" && e.status !== "terminated").length;
    const counts: Record<string, number> = { present: 0, absent: 0, late: 0, remote: 0, leave: 0, half_day: 0 };
    let totalWorkingHours = 0;
    let lateCount = 0;
    for (const r of records) { if (r.status in counts) counts[r.status]++; if (r.workingHours) totalWorkingHours += r.workingHours; if (r.isLate) lateCount++; }
    const byDay: Record<string, number> = {};
    for (const r of records) { if (r.status === "present" || r.status === "late" || r.status === "remote") byDay[r.date] = (byDay[r.date] ?? 0) + 1; }
    const dailyPresence = Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    const empMap = new Map(employees.map((e) => [e._id, e]));
    const recordsByEmployee: Record<string, typeof records> = {};
    for (const r of records) { if (!recordsByEmployee[r.employeeId]) recordsByEmployee[r.employeeId] = []; recordsByEmployee[r.employeeId].push(r); }
    const topAbsentees = employees.map((e) => { const recs = recordsByEmployee[e._id] ?? []; return { employeeId: e._id, fullName: e.fullName, photoUrl: e.photoUrl, absentDays: recs.filter((r) => r.status === "absent").length, lateDays: recs.filter((r) => r.isLate).length }; }).sort((a, b) => b.absentDays - a.absentDays).slice(0, 10);
    return { totalRecords: records.length, activeCount, counts, avgWorkingHours: records.length > 0 ? totalWorkingHours / records.length : 0, lateCount, dailyPresence, topAbsentees };
  },
});

export const leaveSummary = query({
  args: { companyId: v.optional(v.id("companies")), year: v.number() },
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const allRequests = await ctx.db.query("leaveRequests").collect();
    const requests = allRequests.filter((r) => new Date(r.startDate).getFullYear() === args.year && (args.companyId ? r.companyId === args.companyId : true));
    const byStatus: Record<string, number> = { pending: 0, approved: 0, rejected: 0 };
    for (const r of requests) { if (r.status in byStatus) byStatus[r.status]++; }
    const byType: Record<string, number> = { annual: 0, sick: 0, casual: 0, emergency: 0, unpaid: 0 };
    for (const r of requests.filter((r) => r.status === "approved")) { if (r.leaveType in byType) byType[r.leaveType] += r.numberOfDays; }
    const byMonth: Record<string, number> = {};
    for (const r of requests.filter((r) => r.status === "approved")) { const month = r.startDate.slice(0, 7); byMonth[month] = (byMonth[month] ?? 0) + r.numberOfDays; }
    const monthlyLeave = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, days]) => ({ month, days }));
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees;
    const empLeave = employees.map((e) => { const approved = requests.filter((r) => r.employeeId === e._id && r.status === "approved"); return { employeeId: e._id, fullName: e.fullName, photoUrl: e.photoUrl, totalDays: approved.reduce((sum, r) => sum + r.numberOfDays, 0), count: approved.length }; });
    return { totalRequests: requests.length, byStatus, byType, monthlyLeave, topLeaves: empLeave.sort((a, b) => b.totalDays - a.totalDays).slice(0, 10) };
  },
});

export const performanceSummary = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const allReviews = await ctx.db.query("performanceReviews").collect();
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees;
    const empIds = new Set(employees.map((e) => e._id));
    const reviews = allReviews.filter((r) => empIds.has(r.employeeId));
    if (reviews.length === 0) return { totalReviews: 0, avgOverallScore: 0, distribution: { excellent: 0, good: 0, average: 0, poor: 0 }, byCategory: {}, topPerformers: [] };
    const avgOverallScore = reviews.reduce((s, r) => s + r.overallScore, 0) / reviews.length;
    const distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
    for (const r of reviews) { if (r.overallScore >= 4.5) distribution.excellent++; else if (r.overallScore >= 3.5) distribution.good++; else if (r.overallScore >= 2.5) distribution.average++; else distribution.poor++; }
    const categories = ["attendanceScore", "taskCompletionScore", "workQualityScore", "communicationScore", "teamworkScore", "responsibilityScore", "productivityScore", "deadlineManagementScore"] as const;
    const byCategory: Record<string, number> = {};
    for (const cat of categories) { const vals = reviews.map((r) => r[cat]).filter((v): v is number => typeof v === "number"); byCategory[cat] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0; }
    const latestByEmployee: Record<string, typeof reviews[number]> = {};
    for (const r of reviews) { const prev = latestByEmployee[r.employeeId]; if (!prev || r._creationTime > prev._creationTime) latestByEmployee[r.employeeId] = r; }
    const topPerformers = await Promise.all(Object.values(latestByEmployee).sort((a, b) => b.overallScore - a.overallScore).slice(0, 10).map(async (r) => { const emp = await ctx.db.get(r.employeeId); return { employeeId: r.employeeId, fullName: emp?.fullName ?? "Unknown", photoUrl: emp?.photoUrl ?? null, overallScore: r.overallScore, periodLabel: r.periodLabel }; }));
    return { totalReviews: reviews.length, avgOverallScore, distribution, byCategory, topPerformers };
  },
});

export const headcountOverview = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees;
    const byStatus: Record<string, number> = { active: 0, on_leave: 0, probation: 0, resigned: 0, terminated: 0 };
    const byWorkMode: Record<string, number> = { onsite: 0, remote: 0, hybrid: 0 };
    const byEmploymentType: Record<string, number> = { full_time: 0, part_time: 0, contract: 0, intern: 0 };
    for (const e of employees) { if (e.status in byStatus) byStatus[e.status]++; if (e.workMode in byWorkMode) byWorkMode[e.workMode]++; if (e.employmentType in byEmploymentType) byEmploymentType[e.employmentType]++; }
    const allDepts = await ctx.db.query("departments").collect();
    const byDepartment = allDepts.filter((d) => !args.companyId || d.companyId === args.companyId).map((d) => ({ name: d.name, count: employees.filter((e) => e.departmentId === d._id).length })).sort((a, b) => b.count - a.count);
    const now = new Date();
    const monthlyJoining: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); const monthStr = d.toISOString().slice(0, 7); monthlyJoining.push({ month: monthStr, count: employees.filter((e) => e.joiningDate?.startsWith(monthStr)).length }); }
    return { total: employees.length, byStatus, byWorkMode, byEmploymentType, byDepartment, monthlyJoining };
  },
});

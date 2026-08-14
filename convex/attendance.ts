import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ADMIN_ROLES, MANAGER_ROLES, getCurrentActor, requireRole } from "./lib/auth";
import { attendanceStatusValidator } from "./schema/attendance";
import { workModeValidator } from "./schema/employees";

const LATE_THRESHOLD_HOUR = 9;
const LATE_THRESHOLD_MINUTE = 30;
const STANDARD_END_HOUR = 18;
const STANDARD_WORK_HOURS = 8;

function calcWorkingHours(checkInAt: string, checkOutAt: string): number {
  const diff = (new Date(checkOutAt).getTime() - new Date(checkInAt).getTime()) / 3600000;
  return Math.max(0, diff > 5 ? diff - 1 : diff);
}

function isLateCheckIn(checkInAt: string): boolean {
  const d = new Date(checkInAt);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  return h > LATE_THRESHOLD_HOUR || (h === LATE_THRESHOLD_HOUR && m > LATE_THRESHOLD_MINUTE);
}

function isEarlyCheckout(checkOutAt: string): boolean {
  const d = new Date(checkOutAt);
  return d.getUTCHours() < STANDARD_END_HOUR;
}

function overtimeHours(workingHours: number): number | undefined {
  const ot = workingHours - STANDARD_WORK_HOURS;
  return ot > 0 ? Math.round(ot * 10) / 10 : undefined;
}

export const listByDate = query({
  args: {
    date: v.string(),
    companyId: v.optional(v.id("companies")),
  },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const employees = args.companyId
      ? await ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.companyId!)).collect()
      : await ctx.db.query("employees").collect();
    const activeEmployees = employees.filter((e) => e.status !== "resigned" && e.status !== "terminated");
    const records = args.companyId
      ? await ctx.db.query("attendance").withIndex("by_company_and_date", (q) => q.eq("companyId", args.companyId!).eq("date", args.date)).collect()
      : await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", args.date)).collect();
    const recordByEmployee = new Map(records.map((r) => [r.employeeId, r]));
    const deptIds = [...new Set(activeEmployees.map((e) => e.departmentId))];
    const depts = await Promise.all(deptIds.map((id) => ctx.db.get(id)));
    const deptMap = new Map(depts.filter(Boolean).map((d) => [d!._id, d!.name]));
    return activeEmployees.map((emp) => ({
      employee: {
        _id: emp._id,
        fullName: emp.fullName,
        employeeCode: emp.employeeCode,
        position: emp.position,
        photoUrl: emp.photoUrl,
        departmentName: deptMap.get(emp.departmentId) ?? "\u2014",
        workMode: emp.workMode,
      },
      record: recordByEmployee.get(emp._id) ?? null,
    }));
  },
});

export const statsByDate = query({
  args: { date: v.string(), companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const records = args.companyId
      ? await ctx.db.query("attendance").withIndex("by_company_and_date", (q) => q.eq("companyId", args.companyId!).eq("date", args.date)).collect()
      : await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", args.date)).collect();
    const counts: Record<string, number> = { present: 0, absent: 0, late: 0, remote: 0, leave: 0, half_day: 0 };
    for (const r of records) { if (r.status in counts) counts[r.status]++; }
    return counts;
  },
});

export const listByEmployeeAndMonth = query({
  args: { employeeId: v.id("employees"), month: v.string() },
  handler: async (ctx, args) => {
    const actor = await getCurrentActor(ctx);
    const isSelf = actor.employee?._id === args.employeeId;
    if (!isSelf && !MANAGER_ROLES.includes(actor.role)) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    const records = await ctx.db.query("attendance").withIndex("by_employee_and_date", (q) => q.eq("employeeId", args.employeeId)).collect();
    return records.filter((r) => r.date.startsWith(args.month));
  },
});

export const checkIn = mutation({
  args: { workMode: workModeValidator },
  handler: async (ctx, args) => {
    const actor = await getCurrentActor(ctx);
    if (!actor.employee) throw new ConvexError({ message: "No employee profile linked", code: "NOT_FOUND" });
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const existing = await ctx.db.query("attendance").withIndex("by_employee_and_date", (q) => q.eq("employeeId", actor.employee!._id).eq("date", date)).unique();
    if (existing) throw new ConvexError({ message: "Already checked in today", code: "CONFLICT" });
    const late = isLateCheckIn(now);
    await ctx.db.insert("attendance", { employeeId: actor.employee._id, companyId: actor.employee.companyId, date, checkInAt: now, workMode: args.workMode, isLate: late, isEarlyCheckout: false, status: late ? "late" : "present" });
  },
});

export const checkOut = mutation({
  args: {},
  handler: async (ctx, _args) => {
    const actor = await getCurrentActor(ctx);
    if (!actor.employee) throw new ConvexError({ message: "No employee profile linked", code: "NOT_FOUND" });
    const now = new Date().toISOString();
    const date = now.slice(0, 10);
    const record = await ctx.db.query("attendance").withIndex("by_employee_and_date", (q) => q.eq("employeeId", actor.employee!._id).eq("date", date)).unique();
    if (!record) throw new ConvexError({ message: "No check-in record found for today", code: "NOT_FOUND" });
    if (record.checkOutAt) throw new ConvexError({ message: "Already checked out", code: "CONFLICT" });
    const wh = calcWorkingHours(record.checkInAt!, now);
    const early = isEarlyCheckout(now);
    const ot = overtimeHours(wh);
    await ctx.db.patch(record._id, { checkOutAt: now, workingHours: Math.round(wh * 10) / 10, isEarlyCheckout: early, overtimeHours: ot });
  },
});

export const markAttendance = mutation({
  args: {
    employeeId: v.id("employees"),
    date: v.string(),
    status: attendanceStatusValidator,
    workMode: workModeValidator,
    checkInAt: v.optional(v.string()),
    checkOutAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new ConvexError({ message: "Employee not found", code: "NOT_FOUND" });
    const existing = await ctx.db.query("attendance").withIndex("by_employee_and_date", (q) => q.eq("employeeId", args.employeeId).eq("date", args.date)).unique();
    const late = args.checkInAt ? isLateCheckIn(args.checkInAt) : false;
    const early = args.checkInAt && args.checkOutAt ? isEarlyCheckout(args.checkOutAt) : false;
    const wh = args.checkInAt && args.checkOutAt ? Math.round(calcWorkingHours(args.checkInAt, args.checkOutAt) * 10) / 10 : undefined;
    const ot = wh !== undefined ? overtimeHours(wh) : undefined;
    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status, workMode: args.workMode, checkInAt: args.checkInAt, checkOutAt: args.checkOutAt, workingHours: wh, isLate: late, isEarlyCheckout: early, overtimeHours: ot });
    } else {
      await ctx.db.insert("attendance", { employeeId: args.employeeId, companyId: employee.companyId, date: args.date, status: args.status, workMode: args.workMode, checkInAt: args.checkInAt, checkOutAt: args.checkOutAt, workingHours: wh, isLate: late, isEarlyCheckout: early, overtimeHours: ot });
    }
  },
});

export const removeAttendance = mutation({
  args: { attendanceId: v.id("attendance") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    await ctx.db.delete(args.attendanceId);
  },
});

export const analyticsByDate = query({
  args: { date: v.string(), companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<{ workMode: { office: number; remote: number; hybrid: number }; lateArrivals: { employeeId: string; fullName: string; photoUrl?: string; position: string; checkInAt: string }[]; avgCheckInMinutes: number | null; checkedInCount: number }> => {
    await getCurrentActor(ctx);
    const records = args.companyId
      ? await ctx.db.query("attendance").withIndex("by_company_and_date", (q) => q.eq("companyId", args.companyId!).eq("date", args.date)).collect()
      : await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", args.date)).collect();
    const workMode = { office: 0, remote: 0, hybrid: 0 };
    for (const r of records) { if (r.status === "absent" || r.status === "leave") continue; workMode[r.workMode]++; }
    let totalMinutes = 0;
    let checkedInCount = 0;
    const lateRecords = records.filter((r) => r.isLate === true && r.checkInAt);
    for (const r of records) { if (!r.checkInAt) continue; const d = new Date(r.checkInAt); totalMinutes += d.getUTCHours() * 60 + d.getUTCMinutes(); checkedInCount++; }
    const avgCheckInMinutes = checkedInCount > 0 ? Math.round(totalMinutes / checkedInCount) : null;
    const lateEmployees = await Promise.all(lateRecords.map(async (r) => {
      const emp = await ctx.db.get(r.employeeId);
      return emp ? { employeeId: emp._id as string, fullName: emp.fullName, photoUrl: emp.photoUrl, position: emp.position, checkInAt: r.checkInAt! } : null;
    }));
    const lateArrivals = lateEmployees.filter((e): e is NonNullable<typeof e> => e !== null).sort((a, b) => a.checkInAt.localeCompare(b.checkInAt));
    return { workMode, lateArrivals, avgCheckInMinutes, checkedInCount };
  },
});

export const monthlyStats = query({
  args: { companyId: v.optional(v.id("companies")), month: v.string() },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const employees = args.companyId ? await ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.companyId!)).collect() : await ctx.db.query("employees").collect();
    const activeCount = employees.filter((e) => e.status !== "resigned" && e.status !== "terminated").length;
    const records = args.companyId ? await ctx.db.query("attendance").withIndex("by_company_and_date", (q) => q.eq("companyId", args.companyId!)).collect() : await ctx.db.query("attendance").collect();
    const monthRecords = records.filter((r) => r.date.startsWith(args.month));
    const byDate = new Map<string, typeof monthRecords>();
    for (const r of monthRecords) { const arr = byDate.get(r.date) ?? []; arr.push(r); byDate.set(r.date, arr); }
    const days = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, recs]) => {
      const present = recs.filter((r) => r.status === "present" || r.status === "late" || r.status === "half_day").length;
      const remote = recs.filter((r) => r.status === "remote").length;
      const absent = recs.filter((r) => r.status === "absent").length;
      const leave = recs.filter((r) => r.status === "leave").length;
      const rate = activeCount > 0 ? Math.round(((present + remote) / activeCount) * 100) : 0;
      return { date, present, remote, absent, leave, total: activeCount, rate };
    });
    return { days, activeCount };
  },
});

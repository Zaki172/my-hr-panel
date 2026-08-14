import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, MANAGER_ROLES } from "./lib/auth";
import { scheduleStatusValidator } from "./schema/workSchedules";
import type { Id } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server";

export const listByMonth = query({
  args: { month: v.string(), companyId: v.optional(v.id("companies")), departmentId: v.optional(v.id("departments")), employeeId: v.optional(v.id("employees")) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const startDate = `${args.month}-01`;
    const [year, mon] = args.month.split("-").map(Number);
    const endDate = `${args.month}-${new Date(year, mon, 0).toString().padStart(2, "0")}`;
    let employeeIds: Id<"employees">[];
    if (args.employeeId) employeeIds = [args.employeeId];
    else if (args.departmentId) { const deptEmployees = await ctx.db.query("employees").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId as Id<"departments">)).collect(); employeeIds = deptEmployees.filter((e) => e.status === "active" || e.status === "probation").map((e) => e._id); }
    else if (args.companyId) { const companyEmployees = await ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect(); employeeIds = companyEmployees.filter((e) => e.status === "active" || e.status === "probation").map((e) => e._id); }
    else { const all = await ctx.db.query("employees").collect(); employeeIds = all.filter((e) => e.status === "active" || e.status === "probation").map((e) => e._id); }
    const scheduleEntries = await Promise.all(employeeIds.map(async (empId) => ctx.db.query("workSchedules").withIndex("by_employee_and_date", (q) => q.eq("employeeId", empId).gte("date", startDate).lte("date", endDate)).collect()));
    const byKey: Record<string, { status: string; note?: string }> = {};
    for (const entries of scheduleEntries) { for (const e of entries) byKey[`${e.employeeId}:${e.date}`] = { status: e.status, note: e.note }; }
    const employees = await Promise.all(employeeIds.map(async (id) => { const emp = await ctx.db.get(id); if (!emp) return null; const dept = await ctx.db.get(emp.departmentId); return { _id: emp._id, fullName: emp.fullName, photoUrl: emp.photoUrl, position: emp.position, departmentName: dept?.name ?? null }; }));
    const holidays = await listHolidaysForRange(ctx, startDate, endDate, args.companyId);
    return { employees: employees.filter(Boolean), scheduleByKey: byKey, holidays };
  },
});

async function listHolidaysForRange(ctx: QueryCtx, startDate: string, endDate: string, companyId?: Id<"companies">) {
  const all = await ctx.db.query("holidays").withIndex("by_date", (q) => q.gte("date", startDate).lte("date", endDate)).collect();
  return all.filter((h) => !h.companyId || h.companyId === companyId);
}

export const upsert = mutation({
  args: { employeeId: v.id("employees"), date: v.string(), status: scheduleStatusValidator, note: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const emp = await ctx.db.get(args.employeeId);
    if (!emp) throw new ConvexError({ message: "Employee not found", code: "NOT_FOUND" });
    const existing = await ctx.db.query("workSchedules").withIndex("by_employee_and_date", (q) => q.eq("employeeId", args.employeeId).eq("date", args.date)).unique();
    if (existing) await ctx.db.patch(existing._id, { status: args.status, note: args.note });
    else await ctx.db.insert("workSchedules", { employeeId: args.employeeId, companyId: emp.companyId, date: args.date, status: args.status, note: args.note });
  },
});

export const remove = mutation({
  args: { employeeId: v.id("employees"), date: v.string() },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const existing = await ctx.db.query("workSchedules").withIndex("by_employee_and_date", (q) => q.eq("employeeId", args.employeeId).eq("date", args.date)).unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

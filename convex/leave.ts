import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, MANAGER_ROLES } from "./lib/auth";
import { leaveTypeValidator, leaveStatusValidator } from "./schema/leave";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server";

async function enrichRequest(ctx: QueryCtx, req: Doc<"leaveRequests">) {
  const [employee, reviewer] = await Promise.all([ctx.db.get(req.employeeId), req.reviewedBy ? ctx.db.get(req.reviewedBy) : Promise.resolve(null)]);
  return { ...req, employeeName: employee?.fullName ?? null, employeePhoto: employee?.photoUrl ?? null, employeeCode: employee?.employeeCode ?? null, reviewerName: reviewer?.fullName ?? null };
}

export const list = query({
  args: { companyId: v.optional(v.id("companies")), status: v.optional(leaveStatusValidator), employeeId: v.optional(v.id("employees")) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    let rows: Doc<"leaveRequests">[];
    if (args.employeeId) rows = await ctx.db.query("leaveRequests").withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId as Id<"employees">)).collect();
    else if (args.companyId && args.status) rows = await ctx.db.query("leaveRequests").withIndex("by_company_and_status", (q) => q.eq("companyId", args.companyId as Id<"companies">).eq("status", args.status as Doc<"leaveRequests">["status"])).collect();
    else if (args.companyId) rows = await ctx.db.query("leaveRequests").withIndex("by_company_and_status", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect();
    else if (args.status) rows = await ctx.db.query("leaveRequests").withIndex("by_status", (q) => q.eq("status", args.status as Doc<"leaveRequests">["status"])).collect();
    else rows = await ctx.db.query("leaveRequests").collect();
    rows.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(rows.map((r) => enrichRequest(ctx, r)));
  },
});

export const getMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return [];
    const rows = await ctx.db.query("leaveRequests").withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).collect();
    rows.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(rows.map((r) => enrichRequest(ctx, r)));
  },
});

export const getBalances = query({
  args: { employeeId: v.optional(v.id("employees")), year: v.number() },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const empId = args.employeeId;
    if (!empId) return [];
    return ctx.db.query("leaveBalances").withIndex("by_employee_and_year", (q) => q.eq("employeeId", empId).eq("year", args.year)).collect();
  },
});

export const getMyBalances = query({
  args: { year: v.number() },
  handler: async (ctx, args) => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return [];
    return ctx.db.query("leaveBalances").withIndex("by_employee_and_year", (q) => q.eq("employeeId", employee._id).eq("year", args.year)).collect();
  },
});

export type CalendarLeave = { _id: Id<"leaveRequests">; employeeId: Id<"employees">; employeeName: string; employeePhoto: string | null; leaveType: string; startDate: string; endDate: string; numberOfDays: number; status: "pending" | "approved" | "rejected" };

export const calendar = query({
  args: { month: v.string(), companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<CalendarLeave[]> => {
    await getCurrentActor(ctx);
    const monthStart = `${args.month}-01`;
    const monthEnd = `${args.month}-31`;
    const rows = args.companyId ? await ctx.db.query("leaveRequests").withIndex("by_company_and_status", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect() : await ctx.db.query("leaveRequests").collect();
    const overlapping = rows.filter((r) => r.status !== "rejected" && r.startDate <= monthEnd && r.endDate >= monthStart);
    return Promise.all(overlapping.map(async (r) => {
      const emp = await ctx.db.get(r.employeeId);
      return { _id: r._id, employeeId: r.employeeId, employeeName: emp?.fullName ?? "Unknown", employeePhoto: emp?.photoUrl ?? null, leaveType: r.leaveType, startDate: r.startDate, endDate: r.endDate, numberOfDays: r.numberOfDays, status: r.status };
    }));
  },
});

export const submit = mutation({
  args: { leaveType: leaveTypeValidator, startDate: v.string(), endDate: v.string(), numberOfDays: v.number(), reason: v.string(), emergencyContact: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"leaveRequests">> => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) throw new ConvexError({ message: "No employee profile found", code: "FORBIDDEN" });
    const existing = await ctx.db.query("leaveRequests").withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).collect();
    const overlap = existing.find((r) => r.status !== "rejected" && r.startDate <= args.endDate && r.endDate >= args.startDate);
    if (overlap) throw new ConvexError({ message: "You already have a leave request that overlaps with these dates", code: "CONFLICT" });
    const id = await ctx.db.insert("leaveRequests", { employeeId: employee._id, companyId: employee.companyId, leaveType: args.leaveType, startDate: args.startDate, endDate: args.endDate, numberOfDays: args.numberOfDays, reason: args.reason, emergencyContact: args.emergencyContact, status: "pending" });
    const managers = await ctx.db.query("userRoles").collect();
    const managerRoles = managers.filter((r) => r.role === "hr_manager" || r.role === "super_admin" || r.role === "manager");
    for (const mr of managerRoles) {
      const mgr = await ctx.db.query("employees").withIndex("by_user", (q) => q.eq("userId", mr.userId)).first();
      if (mgr && mgr.companyId === employee.companyId && mgr._id !== employee._id) {
        await ctx.db.insert("notifications", { employeeId: mgr._id, type: "leave_submitted", title: "New Leave Request", message: `${employee.fullName} submitted a ${args.leaveType} leave request for ${args.numberOfDays} day(s).`, isRead: false, linkPath: "/leave" });
      }
    }
    return id;
  },
});

export const review = mutation({
  args: { requestId: v.id("leaveRequests"), action: v.union(v.literal("approved"), v.literal("rejected")), reviewNote: v.optional(v.string()) },
  handler: async (ctx, args): Promise<void> => {
    const { employee } = await requireRole(ctx, MANAGER_ROLES);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError({ message: "Leave request not found", code: "NOT_FOUND" });
    if (req.status !== "pending") throw new ConvexError({ message: "Request is no longer pending", code: "CONFLICT" });
    await ctx.db.patch(args.requestId, { status: args.action, reviewedBy: employee?._id, reviewedAt: new Date().toISOString(), reviewNote: args.reviewNote });
    await ctx.db.insert("notifications", { employeeId: req.employeeId, type: args.action === "approved" ? "leave_approved" : "leave_rejected", title: args.action === "approved" ? "Leave Request Approved" : "Leave Request Rejected", message: args.reviewNote ? `Your leave request was ${args.action}. Note: ${args.reviewNote}` : `Your leave request from ${req.startDate} to ${req.endDate} was ${args.action}.`, isRead: false, linkPath: "/leave" });
    if (args.action === "approved") {
      const year = new Date(req.startDate).getFullYear();
      const balance = await ctx.db.query("leaveBalances").withIndex("by_employee_and_year", (q) => q.eq("employeeId", req.employeeId).eq("year", year)).collect();
      const existing = balance.find((b) => b.leaveType === req.leaveType);
      if (existing) await ctx.db.patch(existing._id, { usedDays: existing.usedDays + req.numberOfDays });
      else { const defaults: Record<string, number> = { annual: 14, sick: 10, casual: 7, emergency: 3, unpaid: 0 }; await ctx.db.insert("leaveBalances", { employeeId: req.employeeId, year, leaveType: req.leaveType, totalDays: defaults[req.leaveType] ?? 7, usedDays: req.numberOfDays }); }
    }
  },
});

export const cancel = mutation({
  args: { requestId: v.id("leaveRequests") },
  handler: async (ctx, args): Promise<void> => {
    const { employee } = await getCurrentActor(ctx);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new ConvexError({ message: "Leave request not found", code: "NOT_FOUND" });
    if (req.employeeId !== employee?._id) throw new ConvexError({ message: "You can only cancel your own requests", code: "FORBIDDEN" });
    if (req.status !== "pending") throw new ConvexError({ message: "Only pending requests can be cancelled", code: "CONFLICT" });
    await ctx.db.delete(args.requestId);
  },
});

export const initBalances = mutation({
  args: { employeeId: v.id("employees"), year: v.number(), annual: v.number(), sick: v.number(), casual: v.number(), emergency: v.number(), unpaid: v.number() },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const { employeeId, year, ...days } = args;
    const existing = await ctx.db.query("leaveBalances").withIndex("by_employee_and_year", (q) => q.eq("employeeId", employeeId).eq("year", year)).collect();
    for (const [type, total] of Object.entries(days) as [string, number][]) {
      const found = existing.find((b) => b.leaveType === type);
      if (found) await ctx.db.patch(found._id, { totalDays: total });
      else await ctx.db.insert("leaveBalances", { employeeId, year, leaveType: type as Doc<"leaveBalances">["leaveType"], totalDays: total, usedDays: 0 });
    }
  },
});

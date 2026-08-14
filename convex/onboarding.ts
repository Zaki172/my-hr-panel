import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, ADMIN_ROLES, MANAGER_ROLES } from "./lib/auth";
import type { Id } from "./_generated/dataModel.d.ts";

const checklistFields = { personalInfoSubmitted: v.boolean(), contractSigned: v.boolean(), companyEmailCreated: v.boolean(), systemAccountCreated: v.boolean(), departmentAssigned: v.boolean(), managerAssigned: v.boolean(), trainingCompleted: v.boolean(), policyReviewed: v.boolean(), documentsUploaded: v.boolean() };

export const getForEmployee = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => { await getCurrentActor(ctx); return ctx.db.query("onboardingChecklists").withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId)).unique(); },
});

export const listAll = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, MANAGER_ROLES);
    const checklists = await ctx.db.query("onboardingChecklists").collect();
    const result = await Promise.all(checklists.map(async (c) => {
      const emp = await ctx.db.get(c.employeeId);
      if (!emp) return null;
      if (args.companyId && emp.companyId !== args.companyId) return null;
      const fields = [c.personalInfoSubmitted, c.contractSigned, c.companyEmailCreated, c.systemAccountCreated, c.departmentAssigned, c.managerAssigned, c.trainingCompleted, c.policyReviewed, c.documentsUploaded];
      const completedCount = fields.filter(Boolean).length;
      return { ...c, employeeName: emp.fullName, employeeCode: emp.employeeCode, employeePhoto: emp.photoUrl ?? null, progress: Math.round((completedCount / fields.length) * 100), completedCount, totalCount: fields.length };
    }));
    return result.filter(Boolean);
  },
});

export const upsert = mutation({
  args: { employeeId: v.id("employees"), ...checklistFields },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const { employeeId, ...fields } = args;
    const existing = await ctx.db.query("onboardingChecklists").withIndex("by_employee", (q) => q.eq("employeeId", employeeId)).unique();
    if (existing) await ctx.db.patch(existing._id, fields);
    else await ctx.db.insert("onboardingChecklists", { employeeId, ...fields });
  },
});

export const initForEmployee = mutation({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const existing = await ctx.db.query("onboardingChecklists").withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId)).unique();
    if (!existing) await ctx.db.insert("onboardingChecklists", { employeeId: args.employeeId, personalInfoSubmitted: false, contractSigned: false, companyEmailCreated: false, systemAccountCreated: false, departmentAssigned: false, managerAssigned: false, trainingCompleted: false, policyReviewed: false, documentsUploaded: false });
  },
});

export const listHolidays = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const all = await ctx.db.query("holidays").order("asc").collect();
    return args.companyId ? all.filter((h) => h.companyId === args.companyId || h.companyId === undefined) : all;
  },
});

export const addHoliday = mutation({
  args: { name: v.string(), date: v.string(), companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<Id<"holidays">> => { await requireRole(ctx, ADMIN_ROLES); return ctx.db.insert("holidays", args); },
});

export const removeHoliday = mutation({
  args: { holidayId: v.id("holidays") },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, ADMIN_ROLES);
    const h = await ctx.db.get(args.holidayId);
    if (!h) throw new ConvexError({ message: "Holiday not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.holidayId);
  },
});

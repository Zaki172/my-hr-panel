import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ADMIN_ROLES, requireRole, getCurrentActor } from "./lib/auth";

export const list = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const depts = args.companyId ? await ctx.db.query("departments").withIndex("by_company", (q) => q.eq("companyId", args.companyId as NonNullable<typeof args.companyId>)).collect() : await ctx.db.query("departments").collect();
    return Promise.all(depts.map(async (dept) => {
      const [employees, head, company] = await Promise.all([ctx.db.query("employees").withIndex("by_department", (q) => q.eq("departmentId", dept._id)).collect(), dept.headEmployeeId ? ctx.db.get(dept.headEmployeeId) : Promise.resolve(null), ctx.db.get(dept.companyId)]);
      return { ...dept, employeeCount: employees.length, headName: head?.fullName ?? null, companyName: company?.name ?? null };
    }));
  },
});

export const get = query({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const dept = await ctx.db.get(args.departmentId);
    if (!dept) return null;
    const [employees, head, company] = await Promise.all([ctx.db.query("employees").withIndex("by_department", (q) => q.eq("departmentId", dept._id)).collect(), dept.headEmployeeId ? ctx.db.get(dept.headEmployeeId) : Promise.resolve(null), ctx.db.get(dept.companyId)]);
    return { dept, employees, head, company };
  },
});

export const create = mutation({
  args: { companyId: v.id("companies"), name: v.string(), description: v.optional(v.string()), headEmployeeId: v.optional(v.id("employees")) },
  handler: async (ctx, args) => { await requireRole(ctx, ADMIN_ROLES); return ctx.db.insert("departments", args); },
});

export const update = mutation({
  args: { departmentId: v.id("departments"), name: v.optional(v.string()), description: v.optional(v.string()), headEmployeeId: v.optional(v.id("employees")) },
  handler: async (ctx, args) => { await requireRole(ctx, ADMIN_ROLES); const { departmentId, ...rest } = args; await ctx.db.patch(departmentId, rest); },
});

export const remove = mutation({
  args: { departmentId: v.id("departments") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    const employeesInDept = await ctx.db.query("employees").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId)).first();
    if (employeesInDept) throw new ConvexError({ message: "Cannot delete a department that still has employees. Reassign them first.", code: "CONFLICT" });
    await ctx.db.delete(args.departmentId);
  },
});

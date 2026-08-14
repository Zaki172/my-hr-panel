import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireRole, ADMIN_ROLES } from "./lib/auth";
import type { Id } from "./_generated/dataModel.d.ts";

export const updateCompany = mutation({
  args: { companyId: v.id("companies"), name: v.string(), tagline: v.string(), industry: v.string() },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, ADMIN_ROLES);
    const { companyId, ...fields } = args;
    const company = await ctx.db.get(companyId);
    if (!company) throw new ConvexError({ message: "Company not found", code: "NOT_FOUND" });
    await ctx.db.patch(companyId, fields);
  },
});

export const listUserRoles = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    const employees = args.companyId ? await ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect() : await ctx.db.query("employees").collect();
    return Promise.all(employees.map(async (emp) => {
      if (!emp.userId) return { employee: emp, role: null as string | null };
      const roleDoc = await ctx.db.query("userRoles").withIndex("by_user", (q) => q.eq("userId", emp.userId as Id<"users">)).unique();
      return { employee: emp, role: roleDoc?.role ?? "employee" };
    }));
  },
});

export const setUserRole = mutation({
  args: { employeeId: v.id("employees"), role: v.union(v.literal("super_admin"), v.literal("hr_manager"), v.literal("manager"), v.literal("employee")) },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, ADMIN_ROLES);
    const emp = await ctx.db.get(args.employeeId);
    if (!emp) throw new ConvexError({ message: "Employee not found", code: "NOT_FOUND" });
    if (!emp.userId) throw new ConvexError({ message: "Employee has no linked user account", code: "BAD_REQUEST" });
    const existing = await ctx.db.query("userRoles").withIndex("by_user", (q) => q.eq("userId", emp.userId as Id<"users">)).unique();
    if (existing) await ctx.db.patch(existing._id, { role: args.role });
    else await ctx.db.insert("userRoles", { userId: emp.userId, role: args.role });
  },
});

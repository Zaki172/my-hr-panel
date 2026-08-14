import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, ADMIN_ROLES } from "./lib/auth";
import { employmentTypeValidator, workModeValidator, employeeStatusValidator, genderValidator } from "./schema/employees";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

export const list = query({
  args: { companyId: v.optional(v.id("companies")), departmentId: v.optional(v.id("departments")), status: v.optional(employeeStatusValidator), employmentType: v.optional(employmentTypeValidator), search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    let rows: Doc<"employees">[];
    if (args.departmentId) rows = await ctx.db.query("employees").withIndex("by_department", (q) => q.eq("departmentId", args.departmentId as Id<"departments">)).collect();
    else if (args.companyId) rows = await ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect();
    else rows = await ctx.db.query("employees").collect();
    if (args.status) rows = rows.filter((r) => r.status === args.status);
    if (args.employmentType) rows = rows.filter((r) => r.employmentType === args.employmentType);
    if (args.search && args.search.trim().length > 0) { const term = args.search.trim().toLowerCase(); rows = rows.filter((r) => r.fullName.toLowerCase().includes(term) || r.employeeCode.toLowerCase().includes(term) || r.position.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)); }
    return rows.sort((a, b) => a.fullName.localeCompare(b.fullName));
  },
});

export const count = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    if (args.companyId) { const rows = await ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.companyId as NonNullable<typeof args.companyId>)).collect(); return rows.length; }
    const rows = await ctx.db.query("employees").collect();
    return rows.length;
  },
});

export const get = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) return null;
    const [company, department, reportingManager] = await Promise.all([ctx.db.get(employee.companyId), ctx.db.get(employee.departmentId), employee.reportingManagerId ? ctx.db.get(employee.reportingManagerId) : Promise.resolve(null)]);
    return { employee, company, department, reportingManager };
  },
});

const employeeFieldsValidator = {
  employeeCode: v.string(), fullName: v.string(), photoUrl: v.optional(v.string()), phone: v.optional(v.string()), email: v.string(), dateOfBirth: v.optional(v.string()), gender: v.optional(genderValidator), address: v.optional(v.string()), emergencyContactName: v.optional(v.string()), emergencyContactPhone: v.optional(v.string()), companyId: v.id("companies"), departmentId: v.id("departments"), position: v.string(), employmentType: employmentTypeValidator, joiningDate: v.string(), reportingManagerId: v.optional(v.id("employees")), officeLocation: v.string(), workMode: workModeValidator, status: employeeStatusValidator,
};

async function assertUniqueEmailAndCode(ctx: import("./_generated/server").MutationCtx, email: string, employeeCode: string, excludeId?: Id<"employees">) {
  const existingByEmail = await ctx.db.query("employees").withIndex("by_email", (q) => q.eq("email", email)).unique();
  if (existingByEmail && existingByEmail._id !== excludeId) throw new ConvexError({ message: "An employee with this email already exists", code: "CONFLICT" });
  const all = await ctx.db.query("employees").collect();
  const existingByCode = all.find((e) => e.employeeCode.toLowerCase() === employeeCode.toLowerCase());
  if (existingByCode && existingByCode._id !== excludeId) throw new ConvexError({ message: "An employee with this ID already exists", code: "CONFLICT" });
}

export const create = mutation({
  args: employeeFieldsValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    await assertUniqueEmailAndCode(ctx, args.email, args.employeeCode);
    const employeeId = await ctx.db.insert("employees", args);
    const matchingUser = await ctx.db.query("users").filter((q) => q.eq(q.field("email"), args.email)).first();
    if (matchingUser) await ctx.db.patch(employeeId, { userId: matchingUser._id });
    await ctx.db.insert("onboardingChecklists", { employeeId, personalInfoSubmitted: true, contractSigned: false, companyEmailCreated: false, systemAccountCreated: Boolean(matchingUser), departmentAssigned: true, managerAssigned: Boolean(args.reportingManagerId), trainingCompleted: false, policyReviewed: false, documentsUploaded: false });
    return employeeId;
  },
});

export const update = mutation({
  args: { employeeId: v.id("employees"), ...employeeFieldsValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    const { employeeId, ...rest } = args;
    const existing = await ctx.db.get(employeeId);
    if (!existing) throw new ConvexError({ message: "Employee not found", code: "NOT_FOUND" });
    await assertUniqueEmailAndCode(ctx, rest.email, rest.employeeCode, employeeId);
    if (rest.reportingManagerId === employeeId) throw new ConvexError({ message: "An employee cannot be their own manager", code: "BAD_REQUEST" });
    await ctx.db.patch(employeeId, rest);
  },
});

export const remove = mutation({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ADMIN_ROLES);
    const existing = await ctx.db.get(args.employeeId);
    if (!existing) throw new ConvexError({ message: "Employee not found", code: "NOT_FOUND" });
    const directReports = await ctx.db.query("employees").withIndex("by_reporting_manager", (q) => q.eq("reportingManagerId", args.employeeId)).collect();
    for (const report of directReports) await ctx.db.patch(report._id, { reportingManagerId: undefined });
    const checklist = await ctx.db.query("onboardingChecklists").withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId)).unique();
    if (checklist) await ctx.db.delete(checklist._id);
    await ctx.db.delete(args.employeeId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => { await requireRole(ctx, ADMIN_ROLES); return await ctx.storage.generateUploadUrl(); },
});

export const getUploadedFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => { await requireRole(ctx, ADMIN_ROLES); return await ctx.storage.getUrl(args.storageId); },
});

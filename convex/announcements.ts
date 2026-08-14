import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, MANAGER_ROLES } from "./lib/auth";
import {
  announcementCategoryValidator,
  announcementTargetValidator,
} from "./schema/announcements";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server";

async function enrichAnnouncement(ctx: QueryCtx, ann: Doc<"announcements">) {
  const [creator, company, department] = await Promise.all([
    ctx.db.get(ann.createdBy),
    ann.targetCompanyId ? ctx.db.get(ann.targetCompanyId) : Promise.resolve(null),
    ann.targetDepartmentId ? ctx.db.get(ann.targetDepartmentId) : Promise.resolve(null),
  ]);
  return {
    ...ann,
    creatorName: creator?.fullName ?? null,
    creatorPhoto: creator?.photoUrl ?? null,
    targetCompanyName: company?.name ?? null,
    targetDepartmentName: department?.name ?? null,
  };
}

export const list = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return [];
    const all = await ctx.db.query("announcements").collect();
    const visible = all.filter((ann) => {
      if (ann.targetType === "everyone") return true;
      if (ann.targetType === "company") return ann.targetCompanyId === employee.companyId;
      if (ann.targetType === "department") return ann.targetDepartmentId === employee.departmentId;
      if (ann.targetType === "employees") return ann.targetEmployeeIds?.includes(employee._id) ?? false;
      return false;
    });
    const filtered = args.companyId
      ? visible.filter((ann) => ann.targetType === "everyone" || ann.targetCompanyId === args.companyId || ann.createdBy === employee._id)
      : visible;
    filtered.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(filtered.map((a) => enrichAnnouncement(ctx, a)));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: announcementCategoryValidator,
    targetType: announcementTargetValidator,
    targetCompanyId: v.optional(v.id("companies")),
    targetDepartmentId: v.optional(v.id("departments")),
    targetEmployeeIds: v.optional(v.array(v.id("employees"))),
  },
  handler: async (ctx, args): Promise<Id<"announcements">> => {
    const { employee } = await requireRole(ctx, MANAGER_ROLES);
    if (!employee) throw new ConvexError({ message: "No employee profile", code: "FORBIDDEN" });
    const id = await ctx.db.insert("announcements", {
      title: args.title,
      content: args.content,
      category: args.category,
      createdBy: employee._id,
      targetType: args.targetType,
      targetCompanyId: args.targetCompanyId,
      targetDepartmentId: args.targetDepartmentId,
      targetEmployeeIds: args.targetEmployeeIds,
    });
    const targetEmployees = await resolveTargetEmployees(ctx, args);
    for (const emp of targetEmployees) {
      if (emp._id === employee._id) continue;
      await ctx.db.insert("notifications", {
        employeeId: emp._id,
        type: "announcement",
        title: args.title,
        message: args.content.slice(0, 120),
        isRead: false,
        linkPath: "/announcements",
      });
    }
    return id;
  },
});

async function resolveTargetEmployees(
  ctx: QueryCtx,
  args: {
    targetType: Doc<"announcements">["targetType"];
    targetCompanyId?: Id<"companies">;
    targetDepartmentId?: Id<"departments">;
    targetEmployeeIds?: Id<"employees">[];
  },
): Promise<Doc<"employees">[]> {
  if (args.targetType === "everyone") return ctx.db.query("employees").collect();
  if (args.targetType === "company" && args.targetCompanyId) {
    return ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.targetCompanyId!)).collect();
  }
  if (args.targetType === "department" && args.targetDepartmentId) {
    return ctx.db.query("employees").withIndex("by_department", (q) => q.eq("departmentId", args.targetDepartmentId!)).collect();
  }
  if (args.targetType === "employees" && args.targetEmployeeIds) {
    return (await Promise.all(args.targetEmployeeIds.map((id) => ctx.db.get(id)))).filter((e): e is Doc<"employees"> => e !== null);
  }
  return [];
}

export const remove = mutation({
  args: { announcementId: v.id("announcements") },
  handler: async (ctx, args): Promise<void> => {
    const { employee } = await requireRole(ctx, MANAGER_ROLES);
    const ann = await ctx.db.get(args.announcementId);
    if (!ann) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (ann.createdBy !== employee?._id) {
      await requireRole(ctx, ["super_admin", "hr_manager"]);
    }
    await ctx.db.delete(args.announcementId);
  },
});

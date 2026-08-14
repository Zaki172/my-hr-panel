import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, MANAGER_ROLES } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server";

async function enrichReview(ctx: QueryCtx, rev: Doc<"performanceReviews">) {
  const [employee, reviewer] = await Promise.all([ctx.db.get(rev.employeeId), ctx.db.get(rev.reviewedBy)]);
  return { ...rev, employeeName: employee?.fullName ?? null, employeePhoto: employee?.photoUrl ?? null, employeeCode: employee?.employeeCode ?? null, reviewerName: reviewer?.fullName ?? null };
}

export const listForEmployee = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const reviews = await ctx.db.query("performanceReviews").withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId)).collect();
    reviews.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(reviews.map((r) => enrichReview(ctx, r)));
  },
});

export const listForCompany = query({
  args: { companyId: v.optional(v.id("companies")), periodType: v.optional(v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("yearly"))) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    let allReviews = await ctx.db.query("performanceReviews").collect();
    if (args.companyId || args.periodType) {
      const employees = args.companyId ? await ctx.db.query("employees").withIndex("by_company", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect() : null;
      const empIdSet = employees ? new Set(employees.map((e) => e._id)) : null;
      allReviews = allReviews.filter((r) => { if (empIdSet && !empIdSet.has(r.employeeId)) return false; if (args.periodType && r.periodType !== args.periodType) return false; return true; });
    }
    allReviews.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(allReviews.map((r) => enrichReview(ctx, r)));
  },
});

export const getMyReviews = query({
  args: {},
  handler: async (ctx) => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return [];
    const reviews = await ctx.db.query("performanceReviews").withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).collect();
    reviews.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(reviews.map((r) => enrichReview(ctx, r)));
  },
});

const scoreFields = { attendanceScore: v.number(), taskCompletionScore: v.number(), workQualityScore: v.number(), communicationScore: v.number(), teamworkScore: v.number(), responsibilityScore: v.number(), productivityScore: v.number(), deadlineManagementScore: v.number() };

function calcOverall(scores: Record<string, number>): number {
  const vals = Object.values(scores);
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

export const create = mutation({
  args: { employeeId: v.id("employees"), periodType: v.union(v.literal("monthly"), v.literal("quarterly"), v.literal("yearly")), periodLabel: v.string(), feedback: v.optional(v.string()), ...scoreFields },
  handler: async (ctx, args): Promise<Id<"performanceReviews">> => {
    const { employee } = await requireRole(ctx, MANAGER_ROLES);
    if (!employee) throw new ConvexError({ message: "Reviewer not found", code: "NOT_FOUND" });
    const scores = { attendanceScore: args.attendanceScore, taskCompletionScore: args.taskCompletionScore, workQualityScore: args.workQualityScore, communicationScore: args.communicationScore, teamworkScore: args.teamworkScore, responsibilityScore: args.responsibilityScore, productivityScore: args.productivityScore, deadlineManagementScore: args.deadlineManagementScore };
    for (const [key, val] of Object.entries(scores)) { if (val < 1 || val > 5) throw new ConvexError({ message: `${key} must be between 1 and 5`, code: "BAD_REQUEST" }); }
    return ctx.db.insert("performanceReviews", { employeeId: args.employeeId, reviewedBy: employee._id, periodType: args.periodType, periodLabel: args.periodLabel, ...scores, overallScore: calcOverall(scores), feedback: args.feedback });
  },
});

export const update = mutation({
  args: { reviewId: v.id("performanceReviews"), feedback: v.optional(v.string()), ...scoreFields },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const rev = await ctx.db.get(args.reviewId);
    if (!rev) throw new ConvexError({ message: "Review not found", code: "NOT_FOUND" });
    const scores = { attendanceScore: args.attendanceScore, taskCompletionScore: args.taskCompletionScore, workQualityScore: args.workQualityScore, communicationScore: args.communicationScore, teamworkScore: args.teamworkScore, responsibilityScore: args.responsibilityScore, productivityScore: args.productivityScore, deadlineManagementScore: args.deadlineManagementScore };
    await ctx.db.patch(args.reviewId, { ...scores, overallScore: calcOverall(scores), feedback: args.feedback });
  },
});

export const remove = mutation({
  args: { reviewId: v.id("performanceReviews") },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const rev = await ctx.db.get(args.reviewId);
    if (!rev) throw new ConvexError({ message: "Review not found", code: "NOT_FOUND" });
    await ctx.db.delete(args.reviewId);
  },
});

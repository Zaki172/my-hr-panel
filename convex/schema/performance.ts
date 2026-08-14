import { defineTable } from "convex/server";
import { v } from "convex/values";

export const performanceReviews = defineTable({
  employeeId: v.id("employees"),
  reviewedBy: v.id("employees"),
  periodType: v.union(
    v.literal("monthly"),
    v.literal("quarterly"),
    v.literal("yearly"),
  ),
  periodLabel: v.string(),
  attendanceScore: v.number(),
  taskCompletionScore: v.number(),
  workQualityScore: v.number(),
  communicationScore: v.number(),
  teamworkScore: v.number(),
  responsibilityScore: v.number(),
  productivityScore: v.number(),
  deadlineManagementScore: v.number(),
  overallScore: v.number(),
  feedback: v.optional(v.string()),
}).index("by_employee", ["employeeId"]);

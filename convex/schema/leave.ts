import { defineTable } from "convex/server";
import { v } from "convex/values";

export const leaveTypeValidator = v.union(
  v.literal("annual"),
  v.literal("sick"),
  v.literal("casual"),
  v.literal("emergency"),
  v.literal("unpaid"),
);

export const leaveStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
);

export const leaveRequests = defineTable({
  employeeId: v.id("employees"),
  companyId: v.id("companies"),
  leaveType: leaveTypeValidator,
  startDate: v.string(),
  endDate: v.string(),
  numberOfDays: v.number(),
  reason: v.string(),
  attachmentFileId: v.optional(v.id("_storage")),
  emergencyContact: v.optional(v.string()),
  status: leaveStatusValidator,
  reviewedBy: v.optional(v.id("employees")),
  reviewedAt: v.optional(v.string()),
  reviewNote: v.optional(v.string()),
})
  .index("by_employee", ["employeeId"])
  .index("by_company_and_status", ["companyId", "status"])
  .index("by_status", ["status"]);

export const leaveBalances = defineTable({
  employeeId: v.id("employees"),
  year: v.number(),
  leaveType: leaveTypeValidator,
  totalDays: v.number(),
  usedDays: v.number(),
}).index("by_employee_and_year", ["employeeId", "year"]);

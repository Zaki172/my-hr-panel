import { defineTable } from "convex/server";
import { v } from "convex/values";
import { workModeValidator } from "./employees";

export const attendanceStatusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("late"),
  v.literal("remote"),
  v.literal("leave"),
  v.literal("half_day"),
);

export const attendance = defineTable({
  employeeId: v.id("employees"),
  companyId: v.id("companies"),
  date: v.string(),
  checkInAt: v.optional(v.string()),
  checkOutAt: v.optional(v.string()),
  workingHours: v.optional(v.number()),
  workMode: workModeValidator,
  isLate: v.boolean(),
  isEarlyCheckout: v.boolean(),
  overtimeHours: v.optional(v.number()),
  status: attendanceStatusValidator,
})
  .index("by_employee_and_date", ["employeeId", "date"])
  .index("by_company_and_date", ["companyId", "date"])
  .index("by_date", ["date"]);

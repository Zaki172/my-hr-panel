import { defineTable } from "convex/server";
import { v } from "convex/values";

export const scheduleStatusValidator = v.union(
  v.literal("office"),
  v.literal("remote"),
  v.literal("day_off"),
  v.literal("leave"),
  v.literal("holiday"),
  v.literal("business_trip"),
);

export const workSchedules = defineTable({
  employeeId: v.id("employees"),
  companyId: v.id("companies"),
  date: v.string(),
  status: scheduleStatusValidator,
  note: v.optional(v.string()),
})
  .index("by_employee_and_date", ["employeeId", "date"])
  .index("by_company_and_date", ["companyId", "date"]);

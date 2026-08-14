import { defineTable } from "convex/server";
import { v } from "convex/values";

export const employmentTypeValidator = v.union(
  v.literal("full_time"),
  v.literal("part_time"),
  v.literal("intern"),
  v.literal("contract"),
  v.literal("remote"),
);

export const workModeValidator = v.union(
  v.literal("office"),
  v.literal("remote"),
  v.literal("hybrid"),
);

export const employeeStatusValidator = v.union(
  v.literal("active"),
  v.literal("on_leave"),
  v.literal("probation"),
  v.literal("resigned"),
  v.literal("terminated"),
);

export const genderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other"),
);

export const employees = defineTable({
  userId: v.optional(v.id("users")),
  employeeCode: v.string(),
  fullName: v.string(),
  photoUrl: v.optional(v.string()),
  phone: v.optional(v.string()),
  email: v.string(),
  dateOfBirth: v.optional(v.string()),
  gender: v.optional(genderValidator),
  address: v.optional(v.string()),
  emergencyContactName: v.optional(v.string()),
  emergencyContactPhone: v.optional(v.string()),
  companyId: v.id("companies"),
  departmentId: v.id("departments"),
  position: v.string(),
  employmentType: employmentTypeValidator,
  joiningDate: v.string(),
  reportingManagerId: v.optional(v.id("employees")),
  officeLocation: v.string(),
  workMode: workModeValidator,
  status: employeeStatusValidator,
})
  .index("by_company", ["companyId"])
  .index("by_department", ["departmentId"])
  .index("by_user", ["userId"])
  .index("by_email", ["email"])
  .index("by_reporting_manager", ["reportingManagerId"]);

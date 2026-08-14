import { defineTable } from "convex/server";
import { v } from "convex/values";

export const onboardingChecklists = defineTable({
  employeeId: v.id("employees"),
  personalInfoSubmitted: v.boolean(),
  contractSigned: v.boolean(),
  companyEmailCreated: v.boolean(),
  systemAccountCreated: v.boolean(),
  departmentAssigned: v.boolean(),
  managerAssigned: v.boolean(),
  trainingCompleted: v.boolean(),
  policyReviewed: v.boolean(),
  documentsUploaded: v.boolean(),
}).index("by_employee", ["employeeId"]);

export const holidays = defineTable({
  companyId: v.optional(v.id("companies")),
  name: v.string(),
  date: v.string(),
}).index("by_date", ["date"]);

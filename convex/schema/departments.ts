import { defineTable } from "convex/server";
import { v } from "convex/values";

export const departments = defineTable({
  companyId: v.id("companies"),
  name: v.string(),
  description: v.optional(v.string()),
  headEmployeeId: v.optional(v.id("employees")),
}).index("by_company", ["companyId"]);

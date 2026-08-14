import { defineTable } from "convex/server";
import { v } from "convex/values";

export const documentCategoryValidator = v.union(
  v.literal("employment_contract"),
  v.literal("id_passport"),
  v.literal("cv_resume"),
  v.literal("certificate"),
  v.literal("salary_document"),
  v.literal("company_document"),
  v.literal("training_document"),
  v.literal("other"),
);

export const documents = defineTable({
  employeeId: v.id("employees"),
  companyId: v.id("companies"),
  category: documentCategoryValidator,
  fileName: v.string(),
  fileId: v.id("_storage"),
  uploadedBy: v.id("employees"),
  isConfidential: v.boolean(),
}).index("by_employee", ["employeeId"]);

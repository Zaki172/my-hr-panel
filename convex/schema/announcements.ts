import { defineTable } from "convex/server";
import { v } from "convex/values";

export const announcementCategoryValidator = v.union(
  v.literal("holiday"),
  v.literal("new_employee"),
  v.literal("meeting"),
  v.literal("policy_update"),
  v.literal("training"),
  v.literal("emergency"),
);

export const announcementTargetValidator = v.union(
  v.literal("everyone"),
  v.literal("company"),
  v.literal("department"),
  v.literal("employees"),
);

export const announcements = defineTable({
  title: v.string(),
  content: v.string(),
  category: announcementCategoryValidator,
  createdBy: v.id("employees"),
  targetType: announcementTargetValidator,
  targetCompanyId: v.optional(v.id("companies")),
  targetDepartmentId: v.optional(v.id("departments")),
  targetEmployeeIds: v.optional(v.array(v.id("employees"))),
});

export const notificationTypeValidator = v.union(
  v.literal("task_assigned"),
  v.literal("task_deadline_approaching"),
  v.literal("task_overdue"),
  v.literal("leave_submitted"),
  v.literal("leave_approved"),
  v.literal("leave_rejected"),
  v.literal("announcement"),
  v.literal("document_uploaded"),
  v.literal("employee_late"),
  v.literal("employee_absent"),
  v.literal("project_deadline_approaching"),
);

export const notifications = defineTable({
  employeeId: v.id("employees"),
  type: notificationTypeValidator,
  title: v.string(),
  message: v.string(),
  isRead: v.boolean(),
  linkPath: v.optional(v.string()),
})
  .index("by_employee", ["employeeId"])
  .index("by_employee_and_read", ["employeeId", "isRead"]);

export const activityLogs = defineTable({
  employeeId: v.optional(v.id("employees")),
  companyId: v.optional(v.id("companies")),
  action: v.string(),
  description: v.string(),
}).index("by_company", ["companyId"]);

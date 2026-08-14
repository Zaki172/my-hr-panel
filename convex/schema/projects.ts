import { defineTable } from "convex/server";
import { v } from "convex/values";

export const projectStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("review"),
  v.literal("completed"),
  v.literal("on_hold"),
);

export const priorityValidator = v.union(
  v.literal("low"),
  v.literal("medium"),
  v.literal("high"),
  v.literal("urgent"),
);

export const projects = defineTable({
  name: v.string(),
  companyId: v.id("companies"),
  departmentId: v.id("departments"),
  projectManagerId: v.id("employees"),
  startDate: v.string(),
  deadline: v.string(),
  priority: priorityValidator,
  description: v.optional(v.string()),
  progress: v.number(),
  status: projectStatusValidator,
})
  .index("by_company", ["companyId"])
  .index("by_department", ["departmentId"])
  .index("by_manager", ["projectManagerId"]);

export const projectMembers = defineTable({
  projectId: v.id("projects"),
  employeeId: v.id("employees"),
})
  .index("by_project", ["projectId"])
  .index("by_employee", ["employeeId"]);

export const taskStatusValidator = v.union(
  v.literal("not_started"),
  v.literal("in_progress"),
  v.literal("review"),
  v.literal("completed"),
  v.literal("on_hold"),
);

export const tasks = defineTable({
  name: v.string(),
  projectId: v.id("projects"),
  companyId: v.id("companies"),
  assignedEmployeeId: v.id("employees"),
  description: v.optional(v.string()),
  startDate: v.string(),
  dueDate: v.string(),
  priority: priorityValidator,
  status: taskStatusValidator,
  progress: v.number(),
  attachmentFileId: v.optional(v.id("_storage")),
})
  .index("by_project", ["projectId"])
  .index("by_assignee", ["assignedEmployeeId"])
  .index("by_company", ["companyId"]);

export const taskComments = defineTable({
  taskId: v.id("tasks"),
  employeeId: v.id("employees"),
  content: v.string(),
}).index("by_task", ["taskId"]);

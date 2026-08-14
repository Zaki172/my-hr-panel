import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, ADMIN_ROLES, MANAGER_ROLES } from "./lib/auth";
import { projectStatusValidator, priorityValidator, taskStatusValidator } from "./schema/projects";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server";

async function enrichProject(ctx: QueryCtx, project: Doc<"projects">) {
  const [company, department, manager, members] = await Promise.all([ctx.db.get(project.companyId), ctx.db.get(project.departmentId), ctx.db.get(project.projectManagerId), ctx.db.query("projectMembers").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect()]);
  const memberEmployees = await Promise.all(members.map((m) => ctx.db.get(m.employeeId)));
  const taskCount = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", project._id)).collect();
  return { ...project, companyName: company?.name ?? null, departmentName: department?.name ?? null, managerName: manager?.fullName ?? null, members: memberEmployees.filter(Boolean) as Doc<"employees">[], taskCount: taskCount.length, completedTaskCount: taskCount.filter((t) => t.status === "completed").length };
}

export const list = query({
  args: { companyId: v.optional(v.id("companies")), status: v.optional(projectStatusValidator), priority: v.optional(priorityValidator) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    let rows: Doc<"projects">[];
    if (args.companyId) rows = await ctx.db.query("projects").withIndex("by_company", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect();
    else rows = await ctx.db.query("projects").collect();
    if (args.status) rows = rows.filter((r) => r.status === args.status);
    if (args.priority) rows = rows.filter((r) => r.priority === args.priority);
    rows.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(rows.map((r) => enrichProject(ctx, r)));
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;
    return enrichProject(ctx, project);
  },
});

const projectFields = { name: v.string(), companyId: v.id("companies"), departmentId: v.id("departments"), projectManagerId: v.id("employees"), startDate: v.string(), deadline: v.string(), priority: priorityValidator, description: v.optional(v.string()), progress: v.number(), status: projectStatusValidator };

export const create = mutation({
  args: { ...projectFields, memberEmployeeIds: v.array(v.id("employees")) },
  handler: async (ctx, args): Promise<Id<"projects">> => {
    await requireRole(ctx, MANAGER_ROLES);
    const { memberEmployeeIds, ...projectData } = args;
    const projectId = await ctx.db.insert("projects", projectData);
    for (const employeeId of memberEmployeeIds) await ctx.db.insert("projectMembers", { projectId, employeeId });
    return projectId;
  },
});

export const update = mutation({
  args: { projectId: v.id("projects"), ...projectFields, memberEmployeeIds: v.array(v.id("employees")) },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const { projectId, memberEmployeeIds, ...projectData } = args;
    const existing = await ctx.db.get(projectId);
    if (!existing) throw new ConvexError({ message: "Project not found", code: "NOT_FOUND" });
    await ctx.db.patch(projectId, projectData);
    const oldMembers = await ctx.db.query("projectMembers").withIndex("by_project", (q) => q.eq("projectId", projectId)).collect();
    for (const m of oldMembers) await ctx.db.delete(m._id);
    for (const employeeId of memberEmployeeIds) await ctx.db.insert("projectMembers", { projectId, employeeId });
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const existing = await ctx.db.get(args.projectId);
    if (!existing) throw new ConvexError({ message: "Project not found", code: "NOT_FOUND" });
    const members = await ctx.db.query("projectMembers").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    for (const m of members) await ctx.db.delete(m._id);
    const tasks = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    for (const task of tasks) { const comments = await ctx.db.query("taskComments").withIndex("by_task", (q) => q.eq("taskId", task._id)).collect(); for (const c of comments) await ctx.db.delete(c._id); await ctx.db.delete(task._id); }
    await ctx.db.delete(args.projectId);
  },
});

export const listTasks = query({
  args: { projectId: v.id("projects"), status: v.optional(taskStatusValidator), priority: v.optional(priorityValidator) },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    let rows = await ctx.db.query("tasks").withIndex("by_project", (q) => q.eq("projectId", args.projectId)).collect();
    if (args.status) rows = rows.filter((r) => r.status === args.status);
    if (args.priority) rows = rows.filter((r) => r.priority === args.priority);
    return Promise.all(rows.map(async (task) => { const assignee = await ctx.db.get(task.assignedEmployeeId); return { ...task, assigneeName: assignee?.fullName ?? null, assigneePhoto: assignee?.photoUrl ?? null }; }));
  },
});

export const getTask = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const task = await ctx.db.get(args.taskId);
    if (!task) return null;
    const [assignee, project] = await Promise.all([ctx.db.get(task.assignedEmployeeId), ctx.db.get(task.projectId)]);
    return { ...task, assigneeName: assignee?.fullName ?? null, assigneePhoto: assignee?.photoUrl ?? null, projectName: project?.name ?? null };
  },
});

const taskFields = { name: v.string(), projectId: v.id("projects"), companyId: v.id("companies"), assignedEmployeeId: v.id("employees"), description: v.optional(v.string()), startDate: v.string(), dueDate: v.string(), priority: priorityValidator, status: taskStatusValidator, progress: v.number() };

export const createTask = mutation({
  args: taskFields,
  handler: async (ctx, args): Promise<Id<"tasks">> => {
    const { employee } = await requireRole(ctx, MANAGER_ROLES);
    const id = await ctx.db.insert("tasks", args);
    if (employee && employee._id !== args.assignedEmployeeId) {
      await ctx.db.insert("notifications", { employeeId: args.assignedEmployeeId, type: "task_assigned", title: "New Task Assigned", message: `${employee.fullName} assigned you the task "${args.name}" due ${args.dueDate}.`, isRead: false, linkPath: "/tasks" });
    }
    return id;
  },
});

export const updateTask = mutation({
  args: { taskId: v.id("tasks"), ...taskFields },
  handler: async (ctx, args): Promise<void> => {
    const { taskId, ...rest } = args;
    const actor = await getCurrentActor(ctx);
    const task = await ctx.db.get(taskId);
    if (!task) throw new ConvexError({ message: "Task not found", code: "NOT_FOUND" });
    const isManager = MANAGER_ROLES.includes(actor.role);
    if (!isManager) {
      const isAssigned = actor.employee?._id === task.assignedEmployeeId;
      if (!isAssigned) throw new ConvexError({ message: "You can only update your own tasks", code: "FORBIDDEN" });
      await ctx.db.patch(taskId, { status: rest.status, progress: rest.progress });
      return;
    }
    await ctx.db.patch(taskId, rest);
  },
});

export const deleteTask = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args): Promise<void> => {
    await requireRole(ctx, MANAGER_ROLES);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new ConvexError({ message: "Task not found", code: "NOT_FOUND" });
    const comments = await ctx.db.query("taskComments").withIndex("by_task", (q) => q.eq("taskId", args.taskId)).collect();
    for (const c of comments) await ctx.db.delete(c._id);
    await ctx.db.delete(args.taskId);
  },
});

export const listComments = query({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const comments = await ctx.db.query("taskComments").withIndex("by_task", (q) => q.eq("taskId", args.taskId)).collect();
    return Promise.all(comments.map(async (c) => { const emp = await ctx.db.get(c.employeeId); return { ...c, employeeName: emp?.fullName ?? null, employeePhoto: emp?.photoUrl ?? null }; }));
  },
});

export const addComment = mutation({
  args: { taskId: v.id("tasks"), content: v.string() },
  handler: async (ctx, args): Promise<Id<"taskComments">> => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) throw new ConvexError({ message: "No employee profile found", code: "FORBIDDEN" });
    return ctx.db.insert("taskComments", { taskId: args.taskId, employeeId: employee._id, content: args.content });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("taskComments") },
  handler: async (ctx, args): Promise<void> => {
    const { employee, role } = await getCurrentActor(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError({ message: "Comment not found", code: "NOT_FOUND" });
    const isManager = MANAGER_ROLES.includes(role);
    if (!isManager && comment.employeeId !== employee?._id) throw new ConvexError({ message: "You can only delete your own comments", code: "FORBIDDEN" });
    await ctx.db.delete(args.commentId);
  },
});

export type TasksAnalytics = { taskStatus: { not_started: number; in_progress: number; review: number; completed: number; on_hold: number }; projectStatus: { not_started: number; in_progress: number; review: number; completed: number; on_hold: number }; priority: { low: number; medium: number; high: number; urgent: number }; workload: { employeeId: Id<"employees">; name: string; photoUrl?: string; open: number; completed: number; total: number }[]; milestones: { projectId: Id<"projects">; name: string; deadline: string; progress: number; status: string; priority: string }[]; totalTasks: number; totalProjects: number };

export const analytics = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<TasksAnalytics> => {
    await getCurrentActor(ctx);
    const allProjects = args.companyId ? await ctx.db.query("projects").withIndex("by_company", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect() : await ctx.db.query("projects").collect();
    const allTasks = args.companyId ? await ctx.db.query("tasks").withIndex("by_company", (q) => q.eq("companyId", args.companyId as Id<"companies">)).collect() : await ctx.db.query("tasks").collect();
    const taskStatus = { not_started: 0, in_progress: 0, review: 0, completed: 0, on_hold: 0 };
    const priority = { low: 0, medium: 0, high: 0, urgent: 0 };
    for (const t of allTasks) { taskStatus[t.status]++; priority[t.priority]++; }
    const projectStatus = { not_started: 0, in_progress: 0, review: 0, completed: 0, on_hold: 0 };
    for (const p of allProjects) { projectStatus[p.status]++; }
    const byAssignee = new Map<Id<"employees">, { open: number; completed: number }>();
    for (const t of allTasks) { const entry = byAssignee.get(t.assignedEmployeeId) ?? { open: 0, completed: 0 }; if (t.status === "completed") entry.completed++; else entry.open++; byAssignee.set(t.assignedEmployeeId, entry); }
    const workloadRaw = await Promise.all([...byAssignee.entries()].map(async ([employeeId, counts]) => { const emp = await ctx.db.get(employeeId); return { employeeId, name: emp?.fullName ?? "Unknown", photoUrl: emp?.photoUrl, open: counts.open, completed: counts.completed, total: counts.open + counts.completed }; }));
    const workload = workloadRaw.sort((a, b) => b.total - a.total).slice(0, 8);
    const milestones = allProjects.filter((p) => p.status !== "completed").sort((a, b) => a.deadline.localeCompare(b.deadline)).slice(0, 6).map((p) => ({ projectId: p._id, name: p.name, deadline: p.deadline, progress: p.progress, status: p.status, priority: p.priority }));
    return { taskStatus, projectStatus, priority, workload, milestones, totalTasks: allTasks.length, totalProjects: allProjects.length };
  },
});

export const myTasks = query({
  args: {},
  handler: async (ctx) => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return [];
    const tasks = await ctx.db.query("tasks").withIndex("by_assignee", (q) => q.eq("assignedEmployeeId", employee._id)).collect();
    return Promise.all(tasks.map(async (task) => { const project = await ctx.db.get(task.projectId); return { ...task, projectName: project?.name ?? null }; }));
  },
});

export const listByEmployee = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    await getCurrentActor(ctx);
    const tasks = await ctx.db.query("tasks").withIndex("by_assignee", (q) => q.eq("assignedEmployeeId", args.employeeId)).collect();
    tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return Promise.all(tasks.map(async (task) => { const project = await ctx.db.get(task.projectId); return { ...task, projectName: project?.name ?? null }; }));
  },
});

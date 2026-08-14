import { v } from "convex/values";
import { query } from "./_generated/server";
import { getCurrentActor } from "./lib/auth";
import type { Doc, Id } from "./_generated/dataModel";

function todayIso(): string { return new Date().toISOString().slice(0, 10); }

export const getKpis = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<{ totalEmployees: number; presentToday: number; absentToday: number; remoteToday: number; onLeave: number; nakamuraCount: number; innovateCount: number; openTasks: number; overdueTasks: number; pendingLeaveRequests: number }> => {
    await getCurrentActor(ctx);
    const date = todayIso();
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees;
    const employeeIds = new Set(employees.map((e) => e._id));
    const companies = await ctx.db.query("companies").collect();
    const nakamura = companies.find((c) => c.slug === "nakamura");
    const innovate = companies.find((c) => c.slug === "innovate");
    const nakamuraCount = allEmployees.filter((e) => e.companyId === nakamura?._id).length;
    const innovateCount = allEmployees.filter((e) => e.companyId === innovate?._id).length;
    const todaysAttendance = await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", date)).collect();
    const relevantAttendance = todaysAttendance.filter((a) => employeeIds.has(a.employeeId));
    const presentToday = relevantAttendance.filter((a) => a.status === "present" || a.status === "late" || a.status === "half_day").length;
    const remoteToday = relevantAttendance.filter((a) => a.status === "remote").length;
    const absentToday = relevantAttendance.filter((a) => a.status === "absent").length;
    const onLeave = relevantAttendance.filter((a) => a.status === "leave").length;
    const allTasks = await ctx.db.query("tasks").collect();
    const tasks = args.companyId ? allTasks.filter((t) => t.companyId === args.companyId) : allTasks;
    const openTasks = tasks.filter((t) => t.status !== "completed").length;
    const overdueTasks = tasks.filter((t) => t.status !== "completed" && t.dueDate < date).length;
    const allLeaveRequests = await ctx.db.query("leaveRequests").withIndex("by_status", (q) => q.eq("status", "pending")).collect();
    const pendingLeaveRequests = allLeaveRequests.filter((l) => args.companyId ? l.companyId === args.companyId : true).length;
    return { totalEmployees: employees.length, presentToday, absentToday, remoteToday, onLeave, nakamuraCount, innovateCount, openTasks, overdueTasks, pendingLeaveRequests };
  },
});

export const getAttendanceOverview = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<{ present: number; remote: number; absent: number; leave: number; halfDay: number; presentPercentage: number }> => {
    await getCurrentActor(ctx);
    const date = todayIso();
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees;
    const employeeIds = new Set(employees.map((e) => e._id));
    const todaysAttendance = await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", date)).collect();
    const relevant = todaysAttendance.filter((a) => employeeIds.has(a.employeeId));
    const present = relevant.filter((a) => a.status === "present" || a.status === "late").length;
    const remote = relevant.filter((a) => a.status === "remote").length;
    const absent = relevant.filter((a) => a.status === "absent").length;
    const leave = relevant.filter((a) => a.status === "leave").length;
    const halfDay = relevant.filter((a) => a.status === "half_day").length;
    const total = employees.length || 1;
    return { present, remote, absent, leave, halfDay, presentPercentage: Math.round(((present + remote + halfDay * 0.5) / total) * 100) };
  },
});

type TeamPresenceRow = { employee: Doc<"employees">; department: Doc<"departments"> | null; attendance: Doc<"attendance"> | null };

export const getTodaysTeamPresence = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<TeamPresenceRow[]> => {
    await getCurrentActor(ctx);
    const date = todayIso();
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = (args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees).filter((e) => e.status === "active" || e.status === "on_leave" || e.status === "probation");
    const todaysAttendance = await ctx.db.query("attendance").withIndex("by_date", (q) => q.eq("date", date)).collect();
    const attendanceByEmployee = new Map<Id<"employees">, Doc<"attendance">>();
    for (const a of todaysAttendance) attendanceByEmployee.set(a.employeeId, a);
    const departments = await ctx.db.query("departments").collect();
    const departmentsById = new Map(departments.map((d) => [d._id, d]));
    return employees.slice(0, 25).map((employee) => ({ employee, department: departmentsById.get(employee.departmentId) ?? null, attendance: attendanceByEmployee.get(employee._id) ?? null }));
  },
});

type OngoingItem = { task: Doc<"tasks">; project: Doc<"projects"> | null; assignee: Doc<"employees"> | null };

export const getOngoingTasks = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<OngoingItem[]> => {
    await getCurrentActor(ctx);
    const allTasks = await ctx.db.query("tasks").collect();
    const tasks = (args.companyId ? allTasks.filter((t) => t.companyId === args.companyId) : allTasks).filter((t) => t.status !== "completed").sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 6);
    const projects = await ctx.db.query("projects").collect();
    const projectsById = new Map(projects.map((p) => [p._id, p]));
    const employees = await ctx.db.query("employees").collect();
    const employeesById = new Map(employees.map((e) => [e._id, e]));
    return tasks.map((task) => ({ task, project: projectsById.get(task.projectId) ?? null, assignee: employeesById.get(task.assignedEmployeeId) ?? null }));
  },
});

export const getRecentActivity = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<Doc<"activityLogs">[]> => {
    await getCurrentActor(ctx);
    const all = await ctx.db.query("activityLogs").order("desc").take(50);
    const filtered = args.companyId ? all.filter((a) => a.companyId === args.companyId || a.companyId === undefined) : all;
    return filtered.slice(0, 8);
  },
});

export type UpcomingEvent = { id: string; type: "holiday" | "deadline" | "birthday"; title: string; subtitle: string; date: string; daysAway: number };

export const getUpcomingEvents = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<UpcomingEvent[]> => {
    await getCurrentActor(ctx);
    const today = todayIso();
    const now = new Date(today + "T00:00:00Z");
    const horizon = new Date(now);
    horizon.setUTCDate(horizon.getUTCDate() + 45);
    const horizonIso = horizon.toISOString().slice(0, 10);
    const daysBetween = (fromIso: string, toIso: string): number => Math.round((new Date(toIso + "T00:00:00Z").getTime() - new Date(fromIso + "T00:00:00Z").getTime()) / 86400000);
    const events: UpcomingEvent[] = [];
    const holidays = await ctx.db.query("holidays").collect();
    for (const h of holidays) { if (args.companyId && h.companyId && h.companyId !== args.companyId) continue; if (h.date >= today && h.date <= horizonIso) events.push({ id: `holiday-${h._id}`, type: "holiday", title: h.name, subtitle: "Company holiday", date: h.date, daysAway: daysBetween(today, h.date) }); }
    const allProjects = await ctx.db.query("projects").collect();
    const projects = args.companyId ? allProjects.filter((p) => p.companyId === args.companyId) : allProjects;
    for (const p of projects) { if (p.status === "completed") continue; if (p.deadline >= today && p.deadline <= horizonIso) events.push({ id: `deadline-${p._id}`, type: "deadline", title: p.name, subtitle: "Project deadline", date: p.deadline, daysAway: daysBetween(today, p.deadline) }); }
    const allEmployees = await ctx.db.query("employees").collect();
    const employees = (args.companyId ? allEmployees.filter((e) => e.companyId === args.companyId) : allEmployees).filter((e) => e.status !== "resigned" && e.status !== "terminated");
    for (const e of employees) { if (!e.dateOfBirth) continue; const [, month, day] = e.dateOfBirth.split("-"); if (!month || !day) continue; let occurrence = `${now.getUTCFullYear()}-${month}-${day}`; if (occurrence < today) occurrence = `${now.getUTCFullYear() + 1}-${month}-${day}`; if (occurrence >= today && occurrence <= horizonIso) events.push({ id: `birthday-${e._id}`, type: "birthday", title: e.fullName, subtitle: "Birthday", date: occurrence, daysAway: daysBetween(today, occurrence) }); }
    events.sort((a, b) => a.date.localeCompare(b.date));
    return events.slice(0, 8);
  },
});

export const getDepartmentTeams = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args): Promise<{ department: Doc<"departments">; memberCount: number }[]> => {
    await getCurrentActor(ctx);
    const departments = await ctx.db.query("departments").collect();
    const filteredDepts = args.companyId ? departments.filter((d) => d.companyId === args.companyId) : departments;
    const employees = await ctx.db.query("employees").collect();
    return filteredDepts.map((department) => ({ department, memberCount: employees.filter((e) => e.departmentId === department._id).length }));
  },
});

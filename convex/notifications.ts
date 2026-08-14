import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor } from "./lib/auth";
import type { Id } from "./_generated/dataModel.d.ts";

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return [];
    const notes = await ctx.db.query("notifications").withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).collect();
    notes.sort((a, b) => b._creationTime - a._creationTime);
    return notes.slice(0, 50);
  },
});

export const unreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return 0;
    const unread = await ctx.db.query("notifications").withIndex("by_employee_and_read", (q) => q.eq("employeeId", employee._id).eq("isRead", false)).collect();
    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args): Promise<void> => {
    const { employee } = await getCurrentActor(ctx);
    const notif = await ctx.db.get(args.notificationId);
    if (!notif) throw new ConvexError({ message: "Not found", code: "NOT_FOUND" });
    if (notif.employeeId !== employee?._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return;
    const unread = await ctx.db.query("notifications").withIndex("by_employee_and_read", (q) => q.eq("employeeId", employee._id).eq("isRead", false)).collect();
    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});

export const send = mutation({
  args: {
    employeeId: v.id("employees"),
    type: v.union(v.literal("task_assigned"), v.literal("task_deadline_approaching"), v.literal("task_overdue"), v.literal("leave_submitted"), v.literal("leave_approved"), v.literal("leave_rejected"), v.literal("announcement"), v.literal("document_uploaded"), v.literal("employee_late"), v.literal("employee_absent"), v.literal("project_deadline_approaching")),
    title: v.string(),
    message: v.string(),
    linkPath: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"notifications">> => {
    await getCurrentActor(ctx);
    return ctx.db.insert("notifications", { employeeId: args.employeeId, type: args.type, title: args.title, message: args.message, isRead: false, linkPath: args.linkPath });
  },
});

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentActor, requireRole, ADMIN_ROLES, MANAGER_ROLES } from "./lib/auth";
import { documentCategoryValidator } from "./schema/documents";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server";

async function enrichDoc(ctx: QueryCtx, doc: Doc<"documents">) {
  const [employee, uploader] = await Promise.all([ctx.db.get(doc.employeeId), ctx.db.get(doc.uploadedBy)]);
  const fileUrl = await ctx.storage.getUrl(doc.fileId);
  const meta = await ctx.db.system.get("_storage", doc.fileId);
  return { ...doc, fileUrl, fileSize: meta?.size ?? null, contentType: meta?.contentType ?? null, employeeName: employee?.fullName ?? null, employeePhoto: employee?.photoUrl ?? null, employeeCode: employee?.employeeCode ?? null, uploaderName: uploader?.fullName ?? null };
}

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    return ctx.storage.generateUploadUrl();
  },
});

export const save = mutation({
  args: { employeeId: v.id("employees"), category: documentCategoryValidator, fileName: v.string(), fileId: v.id("_storage"), isConfidential: v.boolean() },
  handler: async (ctx, args): Promise<Id<"documents">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    const roleDoc = await ctx.db.query("userRoles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const role = roleDoc?.role ?? "employee";
    const employee = await ctx.db.query("employees").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const targetEmployee = await ctx.db.get(args.employeeId);
    if (!targetEmployee) throw new ConvexError({ message: "Employee not found", code: "NOT_FOUND" });
    const isManager = MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number]);
    if (!isManager && employee?._id !== args.employeeId) throw new ConvexError({ message: "Cannot upload documents for another employee", code: "FORBIDDEN" });
    const uploadedBy = employee?._id ?? args.employeeId;
    const id = await ctx.db.insert("documents", { employeeId: args.employeeId, companyId: targetEmployee.companyId, category: args.category, fileName: args.fileName, fileId: args.fileId, uploadedBy, isConfidential: args.isConfidential });
    if (isManager && employee?._id !== args.employeeId) {
      const uploaderName = employee?.fullName ?? "A manager";
      await ctx.db.insert("notifications", { employeeId: args.employeeId, type: "document_uploaded", title: "New Document Added", message: `${uploaderName} uploaded "${args.fileName}" to your profile.`, isRead: false, linkPath: "/documents" });
    }
    return id;
  },
});

export const listForEmployee = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    const roleDoc = await ctx.db.query("userRoles").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const role = roleDoc?.role ?? "employee";
    const employee = await ctx.db.query("employees").withIndex("by_user", (q) => q.eq("userId", user._id)).unique();
    const isAdmin = ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
    const isManager = MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number]);
    const isSelf = employee?._id === args.employeeId;
    if (!isManager && !isSelf) throw new ConvexError({ message: "Access denied", code: "FORBIDDEN" });
    const docs = await ctx.db.query("documents").withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId)).collect();
    const filtered = docs.filter((d) => !d.isConfidential || isAdmin || isSelf);
    filtered.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(filtered.map((d) => enrichDoc(ctx, d)));
  },
});

export const listForCompany = query({
  args: { companyId: v.optional(v.id("companies")) },
  handler: async (ctx, args) => {
    const { role } = await requireRole(ctx, MANAGER_ROLES);
    let docs: Doc<"documents">[];
    if (args.companyId) docs = await ctx.db.query("documents").filter((q) => q.eq(q.field("companyId"), args.companyId)).collect();
    else docs = await ctx.db.query("documents").collect();
    const isAdmin = ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);
    docs.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(docs.map(async (d) => { const enriched = await enrichDoc(ctx, d); if (!isAdmin && d.isConfidential) return { ...enriched, fileUrl: null }; return enriched; }));
  },
});

export const getMyDocuments = query({
  args: {},
  handler: async (ctx) => {
    const { employee } = await getCurrentActor(ctx);
    if (!employee) return [];
    const docs = await ctx.db.query("documents").withIndex("by_employee", (q) => q.eq("employeeId", employee._id)).collect();
    docs.sort((a, b) => b._creationTime - a._creationTime);
    return Promise.all(docs.map((d) => enrichDoc(ctx, d)));
  },
});

export const remove = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, args): Promise<void> => {
    const { employee, role } = await getCurrentActor(ctx);
    const doc = await ctx.db.get(args.documentId);
    if (!doc) throw new ConvexError({ message: "Document not found", code: "NOT_FOUND" });
    const isManager = MANAGER_ROLES.includes(role as (typeof MANAGER_ROLES)[number]);
    const isOwner = employee?._id === doc.employeeId || employee?._id === doc.uploadedBy;
    if (!isManager && !isOwner) throw new ConvexError({ message: "Not authorized to delete this document", code: "FORBIDDEN" });
    await ctx.storage.delete(doc.fileId);
    await ctx.db.delete(args.documentId);
  },
});

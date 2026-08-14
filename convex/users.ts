import { ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not logged in" });
    const existingUser = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    const userId = existingUser?._id ?? (await ctx.db.insert("users", { name: identity.name, email: identity.email, tokenIdentifier: identity.tokenIdentifier }));
    if (identity.email) {
      const matchingEmployee = await ctx.db.query("employees").withIndex("by_email", (q) => q.eq("email", identity.email as string)).unique();
      if (matchingEmployee && matchingEmployee.userId === undefined) await ctx.db.patch(matchingEmployee._id, { userId });
    }
    const existingRole = await ctx.db.query("userRoles").withIndex("by_user", (q) => q.eq("userId", userId)).unique();
    if (!existingRole) { const anyRole = await ctx.db.query("userRoles").first(); await ctx.db.insert("userRoles", { userId, role: anyRole ? "employee" : "super_admin" }); }
    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Called getCurrentUser without authentication present" });
    return ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
  },
});

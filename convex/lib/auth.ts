import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { roleValidator } from "../schema/roles";
import type { Infer } from "convex/values";

export type Role = Infer<typeof roleValidator>;

export async function getAuthUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      message: "User not logged in",
      code: "UNAUTHENTICATED",
    });
  }
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) {
    throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  }
  return user;
}

export async function getRoleForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Role | null> {
  const roleDoc = await ctx.db
    .query("userRoles")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  return roleDoc?.role ?? null;
}

export async function getCurrentActor(ctx: QueryCtx | MutationCtx) {
  const user = await getAuthUser(ctx);
  const role = (await getRoleForUser(ctx, user._id)) ?? "employee";
  const employee = await ctx.db
    .query("employees")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .unique();
  return { user, role, employee };
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Role[],
) {
  const actor = await getCurrentActor(ctx);
  if (!allowedRoles.includes(actor.role)) {
    throw new ConvexError({
      message: "You do not have permission to perform this action",
      code: "FORBIDDEN",
    });
  }
  return actor;
}

export const ADMIN_ROLES: Role[] = ["super_admin", "hr_manager"];
export const MANAGER_ROLES: Role[] = ["super_admin", "hr_manager", "manager"];

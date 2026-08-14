import { defineTable } from "convex/server";
import { v } from "convex/values";

export const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("hr_manager"),
  v.literal("manager"),
  v.literal("employee"),
);

export const userRoles = defineTable({
  userId: v.id("users"),
  role: roleValidator,
}).index("by_user", ["userId"]);

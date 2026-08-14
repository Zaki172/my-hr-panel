import { defineTable } from "convex/server";
import { v } from "convex/values";

export const companies = defineTable({
  name: v.string(),
  slug: v.string(),
  tagline: v.string(),
  industry: v.string(),
}).index("by_slug", ["slug"]);

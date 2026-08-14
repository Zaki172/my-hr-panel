import { defineSchema } from "convex/server";
import { v } from "convex/values";
import { defineTable } from "convex/server";
import { companies } from "./schema/companies";
import { departments } from "./schema/departments";
import { employees } from "./schema/employees";
import { userRoles } from "./schema/roles";
import { attendance } from "./schema/attendance";
import { workSchedules } from "./schema/workSchedules";
import {
  projects,
  projectMembers,
  tasks,
  taskComments,
} from "./schema/projects";
import { leaveRequests, leaveBalances } from "./schema/leave";
import { performanceReviews } from "./schema/performance";
import { documents } from "./schema/documents";
import { announcements, notifications, activityLogs } from "./schema/announcements";
import { onboardingChecklists, holidays } from "./schema/onboarding";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

  companies,
  departments,
  employees,
  userRoles,
  attendance,
  workSchedules,
  projects,
  projectMembers,
  tasks,
  taskComments,
  leaveRequests,
  leaveBalances,
  performanceReviews,
  documents,
  announcements,
  notifications,
  activityLogs,
  onboardingChecklists,
  holidays,
});

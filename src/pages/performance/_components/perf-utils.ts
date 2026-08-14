import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";

export const SCORE_FIELDS = [
  { key: "attendanceScore" as const, label: "Attendance", icon: "\u{1F4C5}" },
  { key: "taskCompletionScore" as const, label: "Task Completion", icon: "\u{2705}" },
  { key: "workQualityScore" as const, label: "Work Quality", icon: "\u{2B50}" },
  { key: "communicationScore" as const, label: "Communication", icon: "\u{1F4AC}" },
  { key: "teamworkScore" as const, label: "Teamwork", icon: "\u{1F91D}" },
  { key: "responsibilityScore" as const, label: "Responsibility", icon: "\u{1F3AF}" },
  { key: "productivityScore" as const, label: "Productivity", icon: "\u26A1" },
  { key: "deadlineManagementScore" as const, label: "Deadline Mgmt", icon: "\u23F1\uFE0F" },
];

export type ScoreKey = (typeof SCORE_FIELDS)[number]["key"];

export function scoreColor(score: number): string { if (score >= 4.5) return "text-emerald-600 dark:text-emerald-400"; if (score >= 3.5) return "text-sky-600 dark:text-sky-400"; if (score >= 2.5) return "text-amber-600 dark:text-amber-400"; return "text-red-600 dark:text-red-400"; }
export function scoreBg(score: number): string { if (score >= 4.5) return "bg-emerald-500"; if (score >= 3.5) return "bg-sky-500"; if (score >= 2.5) return "bg-amber-500"; return "bg-red-500"; }
export function scoreLabel(score: number): string { if (score >= 4.5) return "Excellent"; if (score >= 3.5) return "Good"; if (score >= 2.5) return "Average"; return "Needs Improvement"; }

export type Review = Doc<"performanceReviews"> & { employeeName: string | null; employeePhoto: string | null; employeeCode: string | null; reviewerName: string | null };

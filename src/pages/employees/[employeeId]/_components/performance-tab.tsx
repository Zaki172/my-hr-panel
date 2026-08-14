import { useQuery } from "convex/react";
import { format } from "date-fns";
import { Award, Star } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

const SCORE_FIELDS: { key: string; label: string }[] = [
  { key: "attendanceScore", label: "Attendance" }, { key: "taskCompletionScore", label: "Task Completion" }, { key: "workQualityScore", label: "Work Quality" }, { key: "communicationScore", label: "Communication" }, { key: "teamworkScore", label: "Teamwork" }, { key: "responsibilityScore", label: "Responsibility" }, { key: "productivityScore", label: "Productivity" }, { key: "deadlineManagementScore", label: "Deadline Mgmt" },
];

function scoreColor(score: number): string { if (score >= 4) return "text-emerald-600 dark:text-emerald-400"; if (score >= 3) return "text-amber-600 dark:text-amber-400"; return "text-red-600 dark:text-red-400"; }

export function PerformanceTab({ employeeId }: { employeeId: Id<"employees"> }) {
  const reviews = useQuery(api.performance.listForEmployee, { employeeId });
  if (reviews === undefined) return (<div className="flex flex-col gap-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}</div>);
  if (reviews.length === 0) return (<Empty><EmptyHeader><EmptyMedia variant="icon"><Award /></EmptyMedia><EmptyTitle>No performance reviews</EmptyTitle><EmptyDescription>This employee has no reviews yet.</EmptyDescription></EmptyHeader></Empty>);
  return (
    <div className="flex flex-col gap-4">
      {reviews.map((review) => (
        <Card key={review._id}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Award className="size-4 text-primary" />{review.periodLabel}<Badge variant="secondary" className="capitalize">{review.periodType}</Badge></CardTitle>
              <div className="flex items-center gap-1"><Star className={cn("size-5 fill-current", scoreColor(review.overallScore))} /><span className={cn("text-xl font-bold", scoreColor(review.overallScore))}>{review.overallScore.toFixed(1)}</span><span className="text-sm text-muted-foreground">/ 5</span></div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
              {SCORE_FIELDS.map((field) => { const val = review[field.key as keyof typeof review] as number; return (<div key={field.key} className="flex flex-col gap-1"><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{field.label}</span><span className={cn("font-medium", scoreColor(val))}>{val}/5</span></div><Progress value={(val / 5) * 100} className="h-1.5" /></div>); })}
            </div>
            {review.feedback && <div className="rounded-lg bg-muted/40 p-3"><p className="text-xs font-medium text-muted-foreground">Feedback</p><p className="mt-1 text-sm">{review.feedback}</p></div>}
            <div className="flex items-center justify-between text-xs text-muted-foreground">{review.reviewerName && <span>Reviewed by {review.reviewerName}</span>}<span>{format(new Date(review._creationTime), "MMM d, yyyy")}</span></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

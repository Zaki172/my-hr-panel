import { useQuery } from "convex/react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { TaskStatusBadge } from "@/components/status-badges.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { KanbanSquare } from "lucide-react";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { cn } from "@/lib/utils.ts";

export function OngoingTasksCard() {
  const { selectedCompanyId } = useCompanyFilter();
  const items = useQuery(api.dashboard.getOngoingTasks, { companyId: selectedCompanyId });
  return (
    <Card>
      <CardHeader><CardTitle>Ongoing Tasks & Projects</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-1">
        {items === undefined ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />) : items.length === 0 ? (
          <Empty><EmptyHeader><EmptyMedia variant="icon"><KanbanSquare /></EmptyMedia><EmptyTitle>No active tasks</EmptyTitle><EmptyDescription>Create a project to get your team moving</EmptyDescription></EmptyHeader></Empty>
        ) : (
          items.map(({ task, project, assignee }) => {
            const daysLeft = differenceInCalendarDays(parseISO(task.dueDate), new Date());
            return (
              <div key={task._id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-accent/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{project?.name ?? "No project"} \u00b7 {assignee?.fullName ?? "Unassigned"}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <TaskStatusBadge status={task.status} />
                  <span className={cn("text-xs text-muted-foreground", daysLeft < 0 && "font-medium text-destructive")}>{daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `Due in ${daysLeft}d`}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

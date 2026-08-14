import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { KanbanSquare, ChevronRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { TaskStatusBadge, PriorityBadge } from "@/components/status-badges.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

export function TasksTab({ employeeId }: { employeeId: Id<"employees"> }) {
  const navigate = useNavigate();
  const tasks = useQuery(api.projects.listByEmployee, { employeeId });
  if (tasks === undefined) return (<div className="flex flex-col gap-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>);
  if (tasks.length === 0) return (<Empty><EmptyHeader><EmptyMedia variant="icon"><KanbanSquare /></EmptyMedia><EmptyTitle>No tasks assigned</EmptyTitle><EmptyDescription>This employee has no tasks assigned yet.</EmptyDescription></EmptyHeader></Empty>);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><KanbanSquare className="size-4 text-primary" />Assigned Tasks</CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-2">
        {tasks.map((task) => {
          const overdue = task.status !== "completed" && task.dueDate < today;
          return (
            <button key={task._id} onClick={() => navigate(`/tasks/${task.projectId}`)} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent/60">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-medium">{task.name}</span><TaskStatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div>
                <div className="mt-1 flex items-center gap-2"><span className="text-xs text-muted-foreground">{task.projectName ?? "\u2014"}</span><span className="text-xs text-muted-foreground">\u00b7</span><span className={overdue ? "text-xs font-medium text-destructive" : "text-xs text-muted-foreground"}>Due {format(new Date(task.dueDate + "T00:00:00"), "MMM d")}{overdue && " (overdue)"}</span></div>
                <div className="mt-1.5 flex items-center gap-2"><Progress value={task.progress} className="h-1.5 flex-1" /><span className="shrink-0 text-xs text-muted-foreground">{task.progress}%</span></div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

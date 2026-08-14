import { useState } from "react";
import { useQuery } from "convex/react";
import { Authenticated } from "convex/react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Plus, KanbanSquare, MoreHorizontal, Pencil, Trash2, Users, CalendarDays } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { TaskStatusBadge, PriorityBadge } from "@/components/status-badges.tsx";
import { ProjectFormDialog } from "./_components/project-form-dialog.tsx";
import { DeleteProjectDialog } from "./_components/delete-project-dialog.tsx";
import { TasksAnalytics } from "./_components/tasks-analytics.tsx";

type EnrichedProject = { _id: Id<"projects">; name: string; companyId: Id<"companies">; departmentId: Id<"departments">; projectManagerId: Id<"employees">; startDate: string; deadline: string; priority: "low" | "medium" | "high" | "urgent"; description?: string; progress: number; status: "not_started" | "in_progress" | "review" | "completed" | "on_hold"; companyName: string | null; departmentName: string | null; managerName: string | null; members: { _id: Id<"employees">; fullName: string; photoUrl?: string }[]; taskCount: number; completedTaskCount: number };

const ALL = "all";

export default function Tasks() {
  return <Authenticated><TasksContent /></Authenticated>;
}

function TasksContent() {
  const { selectedCompanyId } = useCompanyFilter();
  const me = useQuery(api.me.getMe, {});
  const navigate = useNavigate();
  const isManager = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<EnrichedProject | null>(null);
  const [deletingProject, setDeletingProject] = useState<EnrichedProject | null>(null);
  const projects = useQuery(api.projects.list, { companyId: selectedCompanyId, status: statusFilter !== ALL ? (statusFilter as EnrichedProject["status"]) : undefined, priority: priorityFilter !== ALL ? (priorityFilter as EnrichedProject["priority"]) : undefined }) as EnrichedProject[] | undefined;
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-2xl font-bold tracking-tight">Tasks & Projects</h1><p className="text-sm text-muted-foreground">Track projects and manage tasks across both companies.</p></div>
        {isManager && <Button onClick={() => { setEditingProject(null); setFormOpen(true); }}><Plus className="size-4" /> New Project</Button>}
      </div>
      <TasksAnalytics companyId={selectedCompanyId} />
      <Card><CardContent className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All Statuses</SelectItem><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem></SelectContent></Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent><SelectItem value={ALL}>All Priorities</SelectItem><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select>
      </CardContent></Card>
      {projects === undefined ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}</div>)
        : projects.length === 0 ? (<Empty><EmptyHeader><EmptyMedia variant="icon"><KanbanSquare /></EmptyMedia><EmptyTitle>No projects found</EmptyTitle><EmptyDescription>{isManager ? "Create your first project to start tracking work." : "No projects assigned to your company yet."}</EmptyDescription></EmptyHeader>{isManager && <EmptyContent><Button size="sm" onClick={() => { setEditingProject(null); setFormOpen(true); }}>New Project</Button></EmptyContent>}</Empty>)
        : (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{projects.map((project) => <ProjectCard key={project._id} project={project} isManager={isManager} onClick={() => navigate(`/tasks/${project._id}`)} onEdit={() => { setEditingProject(project); setFormOpen(true); }} onDelete={() => setDeletingProject(project)} />)}</div>)}
      {isManager && <ProjectFormDialog open={formOpen} onOpenChange={setFormOpen} project={editingProject} />}
      <DeleteProjectDialog open={deletingProject !== null} onOpenChange={(open) => !open && setDeletingProject(null)} projectId={deletingProject?._id ?? null} projectName={deletingProject?.name ?? ""} onDeleted={() => setDeletingProject(null)} />
    </div>
  );
}

function ProjectCard({ project, isManager, onClick, onEdit, onDelete }: { project: EnrichedProject; isManager: boolean; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const isOverdue = project.status !== "completed" && new Date(project.deadline) < new Date();
  return (
    <Card className="group cursor-pointer transition-shadow hover:shadow-md" onClick={onClick}>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0"><h3 className="font-semibold leading-tight truncate">{project.name}</h3><div className="flex flex-wrap items-center gap-1.5"><TaskStatusBadge status={project.status} /><PriorityBadge priority={project.priority} /></div></div>
          {isManager && (<DropdownMenu><DropdownMenuTrigger asChild><button className="flex size-7 cursor-pointer items-center justify-center rounded-md opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="cursor-pointer" onClick={(e) => { e.stopPropagation(); onEdit(); }}><Pencil className="size-4" /> Edit</DropdownMenuItem><DropdownMenuItem className="cursor-pointer text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}><Trash2 className="size-4" /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>)}
        </div>
        {project.description && <p className="line-clamp-2 text-xs text-muted-foreground">{project.description}</p>}
        <div className="flex flex-col gap-1"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{project.completedTaskCount}/{project.taskCount} tasks</span><span className="font-medium">{project.progress}%</span></div><Progress value={project.progress} className="h-1.5" /></div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /><span className={isOverdue ? "font-medium text-destructive" : ""}>{format(new Date(project.deadline), "MMM d, yyyy")}{isOverdue && " (overdue)"}</span></div>
          <div className="flex items-center gap-0.5">{project.members.slice(0, 4).map((m) => <Avatar key={m._id} className="size-6 ring-1 ring-background"><AvatarImage src={m.photoUrl} /><AvatarFallback className="text-[8px]">{m.fullName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}{project.members.length > 4 && <div className="flex size-6 items-center justify-center rounded-full bg-muted text-[9px] font-medium">+{project.members.length - 4}</div>}{project.members.length === 0 && <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="size-3.5" /> None</div>}</div>
        </div>
        {(project.companyName || project.departmentName) && <div className="flex flex-wrap gap-1">{project.companyName && <Badge variant="secondary" className="text-[10px]">{project.companyName}</Badge>}{project.departmentName && <Badge variant="outline" className="text-[10px]">{project.departmentName}</Badge>}</div>}
      </CardContent>
    </Card>
  );
}

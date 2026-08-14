import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { Authenticated } from "convex/react";
import { format } from "date-fns";
import { ArrowLeft, Plus, MoreHorizontal, Pencil, Trash2, MessageSquare, Send, CalendarDays, Users, Target } from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu.tsx";
import { TaskStatusBadge, PriorityBadge } from "@/components/status-badges.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { TaskFormDialog } from "../_components/task-form-dialog.tsx";
import { TaskProgressDialog } from "../_components/task-progress-dialog.tsx";

type TaskDoc = { _id: Id<"tasks">; name: string; projectId: Id<"projects">; companyId: Id<"companies">; assignedEmployeeId: Id<"employees">; description?: string; startDate: string; dueDate: string; priority: "low" | "medium" | "high" | "urgent"; status: "not_started" | "in_progress" | "review" | "completed" | "on_hold"; progress: number; assigneeName: string | null; assigneePhoto: string | null };

export default function ProjectDetail() {
  return <Authenticated><ProjectDetailContent /></Authenticated>;
}

function ProjectDetailContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const me = useQuery(api.me.getMe, {});
  const project = useQuery(api.projects.get, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const tasks = useQuery(api.projects.listTasks, projectId ? { projectId: projectId as Id<"projects"> } : "skip");
  const deleteTask = useMutation(api.projects.deleteTask);
  const isManager = me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager";
  const myEmployeeId = me?.employee?._id;
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDoc | null>(null);
  const [progressTask, setProgressTask] = useState<TaskDoc | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<Id<"tasks"> | null>(null);
  const handleDeleteTask = async (taskId: Id<"tasks">) => {
    try { await deleteTask({ taskId }); toast.success("Task deleted"); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to delete task"); }
  };
  if (project === undefined || tasks === undefined) return (<div className="mx-auto flex max-w-[1400px] flex-col gap-5"><Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full" /><Skeleton className="h-64 w-full" /></div>);
  if (project === null) return (<div className="mx-auto flex max-w-[1400px] flex-col items-center gap-4 py-20"><p className="text-muted-foreground">Project not found.</p><Button variant="ghost" onClick={() => navigate("/tasks")}><ArrowLeft className="size-4" /> Back to Projects</Button></div>);
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <button onClick={() => navigate("/tasks")} className="flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Projects</button>
          <h1 className="font-serif text-2xl font-bold tracking-tight">{project.name}</h1>
          <div className="flex flex-wrap items-center gap-2"><TaskStatusBadge status={project.status} /><PriorityBadge priority={project.priority} />{project.companyName && <Badge variant="secondary" className="text-xs">{project.companyName}</Badge>}{project.departmentName && <Badge variant="outline" className="text-xs">{project.departmentName}</Badge>}</div>
        </div>
        {isManager && <Button onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}><Plus className="size-4" /> Add Task</Button>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={<Target className="size-4" />} label="Progress" value={<div className="flex w-full flex-col gap-1"><div className="flex justify-between text-sm"><span className="font-semibold">{project.progress}%</span><span className="text-muted-foreground">{project.completedTaskCount}/{project.taskCount} tasks</span></div><Progress value={project.progress} className="h-2" /></div>} />
        <InfoCard icon={<CalendarDays className="size-4" />} label="Timeline" value={<div className="text-sm"><span>{format(new Date(project.startDate), "MMM d")} \u2192 </span><span className="font-medium">{format(new Date(project.deadline), "MMM d, yyyy")}</span></div>} />
        <InfoCard icon={<Users className="size-4" />} label="Manager" value={<span className="text-sm font-medium">{project.managerName ?? "\u2014"}</span>} />
        <InfoCard icon={<Users className="size-4" />} label="Team" value={<div className="flex flex-wrap gap-1">{project.members.length === 0 ? <span className="text-sm text-muted-foreground">No members</span> : project.members.slice(0, 5).map((m) => <Avatar key={m._id} className="size-7 ring-2 ring-background"><AvatarImage src={m.photoUrl} /><AvatarFallback className="text-[10px]">{m.fullName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>)}{project.members.length > 5 && <div className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium">+{project.members.length - 5}</div>}</div>} />
      </div>
      {project.description && <Card><CardContent><p className="text-sm text-muted-foreground">{project.description}</p></CardContent></Card>}
      <Card>
        <CardHeader className="pb-3"><div className="flex items-center justify-between"><CardTitle className="text-lg">Tasks ({tasks.length})</CardTitle></div></CardHeader>
        <CardContent>
          {tasks.length === 0 ? (<Empty><EmptyHeader><EmptyMedia variant="icon"><Target /></EmptyMedia><EmptyTitle>No tasks yet</EmptyTitle><EmptyDescription>Add tasks to track work for this project.</EmptyDescription></EmptyHeader>{isManager && <EmptyContent><Button size="sm" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>Add Task</Button></EmptyContent>}</Empty>)
          : (<div className="flex flex-col divide-y">{tasks.map((task) => <TaskRow key={task._id} task={task} isManager={isManager} myEmployeeId={myEmployeeId} expanded={expandedTaskId === task._id} onToggleExpand={() => setExpandedTaskId((prev) => (prev === task._id ? null : task._id))} onEdit={() => { setEditingTask(task); setTaskFormOpen(true); }} onUpdateProgress={() => setProgressTask(task)} onDelete={() => handleDeleteTask(task._id)} />)}</div>)}
        </CardContent>
      </Card>
      {isManager && <TaskFormDialog open={taskFormOpen} onOpenChange={setTaskFormOpen} projectId={project._id} companyId={project.companyId} task={editingTask} isManager={isManager} />}
      {progressTask && <TaskProgressDialog open={progressTask !== null} onOpenChange={(open: boolean) => !open && setProgressTask(null)} task={progressTask} />}
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (<Card><CardContent className="flex flex-col gap-2"><div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</div>{value}</CardContent></Card>);
}

function TaskRow({ task, isManager, myEmployeeId, expanded, onToggleExpand, onEdit, onUpdateProgress, onDelete }: { task: TaskDoc; isManager: boolean; myEmployeeId?: Id<"employees">; expanded: boolean; onToggleExpand: () => void; onEdit: () => void; onUpdateProgress: () => void; onDelete: () => void }) {
  const isAssigned = myEmployeeId === task.assignedEmployeeId;
  const canEdit = isManager || isAssigned;
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{task.name}</span><TaskStatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{task.assigneeName && <div className="flex items-center gap-1.5"><Avatar className="size-4"><AvatarImage src={task.assigneePhoto ?? undefined} /><AvatarFallback className="text-[8px]">{task.assigneeName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>{task.assigneeName}</div>}<span>Due {format(new Date(task.dueDate), "MMM d, yyyy")}</span></div>
          <div className="flex items-center gap-2"><Progress value={task.progress} className="h-1.5 max-w-[120px]" /><span className="text-xs text-muted-foreground">{task.progress}%</span></div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={onToggleExpand} className="flex cursor-pointer items-center gap-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Comments"><MessageSquare className="size-4" /></button>
          {canEdit && (<DropdownMenu><DropdownMenuTrigger asChild><button className="flex cursor-pointer items-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal className="size-4" /></button></DropdownMenuTrigger><DropdownMenuContent align="end">{(isAssigned || isManager) && <DropdownMenuItem className="cursor-pointer" onClick={onUpdateProgress}><Target className="size-4" /> Update Progress</DropdownMenuItem>}{isManager && (<><DropdownMenuItem className="cursor-pointer" onClick={onEdit}><Pencil className="size-4" /> Edit</DropdownMenuItem><DropdownMenuItem className="cursor-pointer text-destructive" onClick={onDelete}><Trash2 className="size-4" /> Delete</DropdownMenuItem></>)}</DropdownMenuContent></DropdownMenu>)}
        </div>
      </div>
      {expanded && task.description && <p className="mt-2 text-xs text-muted-foreground">{task.description}</p>}
      {expanded && <TaskComments taskId={task._id} />}
    </div>
  );
}

function TaskComments({ taskId }: { taskId: Id<"tasks"> }) {
  const comments = useQuery(api.projects.listComments, { taskId });
  const addComment = useMutation(api.projects.addComment);
  const deleteComment = useMutation(api.projects.deleteComment);
  const me = useQuery(api.me.getMe, {});
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const handleSend = async () => { if (!content.trim()) return; setSending(true); try { await addComment({ taskId, content: content.trim() }); setContent(""); } catch { toast.error("Failed to add comment"); } finally { setSending(false); } };
  const handleDeleteComment = async (commentId: Id<"taskComments">) => { try { await deleteComment({ commentId }); } catch { toast.error("Failed to delete comment"); } };
  return (
    <div className="mt-3 flex flex-col gap-3">
      <Separator />
      <div className="flex flex-col gap-2">
        {comments === undefined && <Skeleton className="h-8 w-full" />}
        {comments?.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
        {comments?.map((c) => (<div key={c._id} className="flex items-start gap-2"><Avatar className="size-6 shrink-0"><AvatarImage src={c.employeePhoto ?? undefined} /><AvatarFallback className="text-[8px]">{(c.employeeName ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-1.5"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">{c.employeeName ?? "Unknown"}</span><span className="text-[10px] text-muted-foreground">{format(new Date(c._creationTime), "MMM d, HH:mm")}</span></div><p className="text-xs">{c.content}</p></div>{(me?.employee?._id === c.employeeId || me?.role === "super_admin" || me?.role === "hr_manager" || me?.role === "manager") && <button onClick={() => handleDeleteComment(c._id)} className="cursor-pointer p-1 text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>}</div>))}
      </div>
      <div className="flex items-start gap-2">
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Add a comment\u2026" rows={1} className="min-h-0 resize-none text-xs" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
        <Button size="icon" variant="ghost" disabled={sending || !content.trim()} onClick={handleSend}><Send className="size-4" /></Button>
      </div>
    </div>
  );
}

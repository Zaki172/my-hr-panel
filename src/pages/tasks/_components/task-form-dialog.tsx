import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

type TaskDoc = { _id: Id<"tasks">; name: string; projectId: Id<"projects">; companyId: Id<"companies">; assignedEmployeeId: Id<"employees">; description?: string; startDate: string; dueDate: string; priority: "low" | "medium" | "high" | "urgent"; status: "not_started" | "in_progress" | "review" | "completed" | "on_hold"; progress: number };

const schema = z.object({ name: z.string().min(1, "Name is required"), assignedEmployeeId: z.string().min(1, "Assignee is required"), description: z.string().optional(), startDate: z.string().min(1), dueDate: z.string().min(1), priority: z.enum(["low", "medium", "high", "urgent"]), status: z.enum(["not_started", "in_progress", "review", "completed", "on_hold"]), progress: z.coerce.number().min(0).max(100) });
type FormValues = z.infer<typeof schema>;

export function TaskFormDialog({ open, onOpenChange, projectId, companyId, task, isManager }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: Id<"projects">; companyId: Id<"companies">; task?: TaskDoc | null; isManager: boolean }) {
  const createTask = useMutation(api.projects.createTask);
  const updateTask = useMutation(api.projects.updateTask);
  const employees = useQuery(api.employees.list, { companyId });
  const activeEmployees = useMemo(() => employees?.filter((e) => e.status === "active" || e.status === "probation") ?? [], [employees]);
  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<FormValues, unknown, FormValues>({ resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>, defaultValues: { name: "", assignedEmployeeId: "", description: "", startDate: new Date().toISOString().split("T")[0], dueDate: "", priority: "medium", status: "not_started", progress: 0 } });
  useEffect(() => {
    if (open) { if (task) reset({ name: task.name, assignedEmployeeId: task.assignedEmployeeId, description: task.description ?? "", startDate: task.startDate, dueDate: task.dueDate, priority: task.priority, status: task.status, progress: task.progress }); else reset({ name: "", assignedEmployeeId: "", description: "", startDate: new Date().toISOString().split("T")[0], dueDate: "", priority: "medium", status: "not_started", progress: 0 }); }
  }, [open, task, reset]);
  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { name: values.name, projectId, companyId, assignedEmployeeId: values.assignedEmployeeId as Id<"employees">, description: values.description || undefined, startDate: values.startDate, dueDate: values.dueDate, priority: values.priority, status: values.status, progress: values.progress };
      if (task) { await updateTask({ taskId: task._id, ...payload }); toast.success("Task updated"); } else { await createTask(payload); toast.success("Task created"); }
      onOpenChange(false);
    } catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Something went wrong"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Task Name</Label><Input {...register("name")} placeholder="e.g. Design homepage mockup" />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
          {isManager && (<div className="flex flex-col gap-1.5"><Label>Assigned To</Label><Controller name="assignedEmployeeId" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{activeEmployees.map((e) => <SelectItem key={e._id} value={e._id}>{e.fullName}</SelectItem>)}</SelectContent></Select>)} />{errors.assignedEmployeeId && <p className="text-xs text-destructive">{errors.assignedEmployeeId.message}</p>}</div>)}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5"><Label>Priority</Label><Controller name="priority" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select>)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Status</Label><Controller name="status" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem></SelectContent></Select>)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Start Date</Label><Input type="date" {...register("startDate")} /></div>
            <div className="flex flex-col gap-1.5"><Label>Due Date</Label><Input type="date" {...register("dueDate")} /></div>
            <div className="flex flex-col gap-1.5"><Label>Progress (%)</Label><Input type="number" min={0} max={100} {...register("progress")} /></div>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Description</Label><Textarea {...register("description")} placeholder="Task details\u2026" rows={3} /></div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving\u2026" : task ? "Save Changes" : "Create Task"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

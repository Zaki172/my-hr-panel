import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCompanyFilter } from "@/hooks/use-company-filter.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";

type EnrichedProject = { _id: Id<"projects">; name: string; companyId: Id<"companies">; departmentId: Id<"departments">; projectManagerId: Id<"employees">; startDate: string; deadline: string; priority: "low" | "medium" | "high" | "urgent"; description?: string; progress: number; status: "not_started" | "in_progress" | "review" | "completed" | "on_hold"; members: { _id: Id<"employees">; fullName: string }[] };

const schema = z.object({ name: z.string().min(1, "Name is required"), companyId: z.string().min(1, "Company is required"), departmentId: z.string().min(1, "Department is required"), projectManagerId: z.string().min(1, "Project manager is required"), startDate: z.string().min(1, "Start date required"), deadline: z.string().min(1, "Deadline required"), priority: z.enum(["low", "medium", "high", "urgent"]), status: z.enum(["not_started", "in_progress", "review", "completed", "on_hold"]), description: z.string().optional(), progress: z.coerce.number().min(0).max(100), memberEmployeeIds: z.array(z.string()) });
type FormValues = z.infer<typeof schema>;

export function ProjectFormDialog({ open, onOpenChange, project }: { open: boolean; onOpenChange: (open: boolean) => void; project?: EnrichedProject | null }) {
  const { companies, selectedCompanyId } = useCompanyFilter();
  const createProject = useMutation(api.projects.create);
  const updateProject = useMutation(api.projects.update);
  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues, unknown, FormValues>({ resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>, defaultValues: { name: "", companyId: selectedCompanyId ?? "", departmentId: "", projectManagerId: "", startDate: new Date().toISOString().split("T")[0], deadline: "", priority: "medium", status: "not_started", description: "", progress: 0, memberEmployeeIds: [] } });
  const watchedCompanyId = watch("companyId");
  const departments = useQuery(api.departments.list, watchedCompanyId ? { companyId: watchedCompanyId as Id<"companies"> } : "skip");
  const employees = useQuery(api.employees.list, watchedCompanyId ? { companyId: watchedCompanyId as Id<"companies"> } : "skip");
  const activeEmployees = useMemo(() => employees?.filter((e) => e.status === "active" || e.status === "probation") ?? [], [employees]);
  useEffect(() => {
    if (open) { if (project) reset({ name: project.name, companyId: project.companyId, departmentId: project.departmentId, projectManagerId: project.projectManagerId, startDate: project.startDate, deadline: project.deadline, priority: project.priority, status: project.status, description: project.description ?? "", progress: project.progress, memberEmployeeIds: project.members.map((m) => m._id) }); else reset({ name: "", companyId: selectedCompanyId ?? "", departmentId: "", projectManagerId: "", startDate: new Date().toISOString().split("T")[0], deadline: "", priority: "medium", status: "not_started", description: "", progress: 0, memberEmployeeIds: [] }); }
  }, [open, project, reset, selectedCompanyId]);
  const onSubmit = async (values: FormValues) => {
    try {
      const payload = { name: values.name, companyId: values.companyId as Id<"companies">, departmentId: values.departmentId as Id<"departments">, projectManagerId: values.projectManagerId as Id<"employees">, startDate: values.startDate, deadline: values.deadline, priority: values.priority, status: values.status, description: values.description || undefined, progress: values.progress, memberEmployeeIds: values.memberEmployeeIds as Id<"employees">[] };
      if (project) { await updateProject({ projectId: project._id, ...payload }); toast.success("Project updated"); } else { await createProject(payload); toast.success("Project created"); }
      onOpenChange(false);
    } catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Something went wrong"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>Project Name</Label><Input {...register("name")} placeholder="e.g. Website Redesign" />{errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}</div>
            <div className="flex flex-col gap-1.5"><Label>Company</Label><Controller name="companyId" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent>{companies?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent></Select>)} />{errors.companyId && <p className="text-xs text-destructive">{errors.companyId.message}</p>}</div>
            <div className="flex flex-col gap-1.5"><Label>Department</Label><Controller name="departmentId" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{departments?.map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}</SelectContent></Select>)} />{errors.departmentId && <p className="text-xs text-destructive">{errors.departmentId.message}</p>}</div>
            <div className="flex flex-col gap-1.5"><Label>Project Manager</Label><Controller name="projectManagerId" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select manager" /></SelectTrigger><SelectContent>{activeEmployees.map((e) => <SelectItem key={e._id} value={e._id}>{e.fullName}</SelectItem>)}</SelectContent></Select>)} />{errors.projectManagerId && <p className="text-xs text-destructive">{errors.projectManagerId.message}</p>}</div>
            <div className="flex flex-col gap-1.5"><Label>Priority</Label><Controller name="priority" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select>)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Status</Label><Controller name="status" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem></SelectContent></Select>)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Start Date</Label><Input type="date" {...register("startDate")} />{errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}</div>
            <div className="flex flex-col gap-1.5"><Label>Deadline</Label><Input type="date" {...register("deadline")} />{errors.deadline && <p className="text-xs text-destructive">{errors.deadline.message}</p>}</div>
            <div className="flex flex-col gap-1.5"><Label>Progress (%)</Label><Input type="number" min={0} max={100} {...register("progress")} /></div>
            <div className="flex flex-col gap-1.5 sm:col-span-2"><Label>Description</Label><Textarea {...register("description")} placeholder="Describe the project\u2026" rows={3} /></div>
            {activeEmployees.length > 0 && (<div className="flex flex-col gap-2 sm:col-span-2"><Label>Team Members</Label><div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2"><Controller name="memberEmployeeIds" control={control} render={({ field }) => (<>{activeEmployees.map((emp) => (<label key={emp._id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted"><Checkbox checked={field.value.includes(emp._id)} onCheckedChange={(checked) => { if (checked) field.onChange([...field.value, emp._id]); else field.onChange(field.value.filter((id) => id !== emp._id)); }} /><span className="text-sm">{emp.fullName}</span></label>))}</>)} /></div></div>)}
          </div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving\u2026" : project ? "Save Changes" : "Create Project"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

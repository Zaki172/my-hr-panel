import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
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

export const CATEGORY_LABELS: Record<string, string> = { holiday: "Holiday", new_employee: "New Employee", meeting: "Meeting", policy_update: "Policy Update", training: "Training", emergency: "Emergency" };
export const TARGET_LABELS: Record<string, string> = { everyone: "Everyone", company: "Specific Company", department: "Specific Department", employees: "Specific Employees" };

const schema = z.object({ title: z.string().min(3, "Title required (min 3 chars)"), content: z.string().min(10, "Content required (min 10 chars)"), category: z.enum(["holiday", "new_employee", "meeting", "policy_update", "training", "emergency"]), targetType: z.enum(["everyone", "company", "department", "employees"]), targetCompanyId: z.string().optional(), targetDepartmentId: z.string().optional() });
type FormValues = z.infer<typeof schema>;

export function CreateAnnouncementDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const create = useMutation(api.announcements.create);
  const companies = useQuery(api.companies.list, open ? {} : "skip");
  const departments = useQuery(api.departments.list, open ? {} : "skip");
  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues, unknown, FormValues>({ resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>, defaultValues: { title: "", content: "", category: "meeting", targetType: "everyone" } });
  const targetType = watch("targetType");
  useEffect(() => { if (open) reset(); }, [open, reset]);
  const onSubmit = async (values: FormValues) => {
    try {
      await create({ title: values.title, content: values.content, category: values.category, targetType: values.targetType, targetCompanyId: values.targetType === "company" && values.targetCompanyId ? (values.targetCompanyId as Id<"companies">) : undefined, targetDepartmentId: values.targetType === "department" && values.targetDepartmentId ? (values.targetDepartmentId as Id<"departments">) : undefined });
      toast.success("Announcement posted"); onOpenChange(false);
    } catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to post announcement"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Post Announcement</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Title</Label><Input {...register("title")} placeholder="Announcement title" />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label>Category</Label><Controller name="category" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Target Audience</Label><Controller name="targetType" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TARGET_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>)} /></div>
          </div>
          {targetType === "company" && <div className="flex flex-col gap-1.5"><Label>Company</Label><Controller name="targetCompanyId" control={control} render={({ field }) => (<Select value={field.value ?? ""} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger><SelectContent>{(companies ?? []).map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent></Select>)} /></div>}
          {targetType === "department" && <div className="flex flex-col gap-1.5"><Label>Department</Label><Controller name="targetDepartmentId" control={control} render={({ field }) => (<Select value={field.value ?? ""} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger><SelectContent>{(departments ?? []).map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}</SelectContent></Select>)} /></div>}
          <div className="flex flex-col gap-1.5"><Label>Content</Label><Textarea {...register("content")} rows={4} placeholder="Write your announcement\u2026" />{errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}</div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Posting\u2026" : "Post Announcement"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

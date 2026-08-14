import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";

const SCORE_FIELDS = [{ key: "attendanceScore", label: "Attendance" }, { key: "taskCompletionScore", label: "Task Completion" }, { key: "workQualityScore", label: "Work Quality" }, { key: "communicationScore", label: "Communication" }, { key: "teamworkScore", label: "Teamwork" }, { key: "responsibilityScore", label: "Responsibility" }, { key: "productivityScore", label: "Productivity" }, { key: "deadlineManagementScore", label: "Deadline Management" }] as const;

const schema = z.object({ employeeId: z.string().min(1, "Select an employee"), periodType: z.enum(["monthly", "quarterly", "yearly"]), periodLabel: z.string().min(1, "Period label required"), attendanceScore: z.number().min(1).max(5), taskCompletionScore: z.number().min(1).max(5), workQualityScore: z.number().min(1).max(5), communicationScore: z.number().min(1).max(5), teamworkScore: z.number().min(1).max(5), responsibilityScore: z.number().min(1).max(5), productivityScore: z.number().min(1).max(5), deadlineManagementScore: z.number().min(1).max(5), feedback: z.string().optional() });
type FormValues = z.infer<typeof schema>;
const SCORE_LABELS: Record<number, string> = { 1: "Poor", 2: "Below Average", 3: "Average", 4: "Good", 5: "Excellent" };

function getPeriodLabel(type: string): string { const now = new Date(); if (type === "monthly") return format(now, "MMMM yyyy"); if (type === "quarterly") { const q = Math.ceil((now.getMonth() + 1) / 3); return `Q${q} ${now.getFullYear()}`; } return `${now.getFullYear()}`; }

type Review = { _id: Id<"performanceReviews">; employeeId: Id<"employees">; periodType: Doc<"performanceReviews">["periodType"]; periodLabel: string; attendanceScore: number; taskCompletionScore: number; workQualityScore: number; communicationScore: number; teamworkScore: number; responsibilityScore: number; productivityScore: number; deadlineManagementScore: number; feedback?: string };

export function ReviewFormDialog({ open, onOpenChange, companyId, editReview }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: Id<"companies">; editReview?: Review | null }) {
  const employees = useQuery(api.employees.list, open ? { companyId } : "skip");
  const createReview = useMutation(api.performance.create);
  const updateReview = useMutation(api.performance.update);
  const isEdit = !!editReview;
  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues, unknown, FormValues>({ resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>, defaultValues: { employeeId: "", periodType: "monthly", periodLabel: getPeriodLabel("monthly"), attendanceScore: 3, taskCompletionScore: 3, workQualityScore: 3, communicationScore: 3, teamworkScore: 3, responsibilityScore: 3, productivityScore: 3, deadlineManagementScore: 3, feedback: "" } });
  const periodType = watch("periodType");
  useEffect(() => { if (!isEdit) setValue("periodLabel", getPeriodLabel(periodType)); }, [periodType, isEdit, setValue]);
  useEffect(() => {
    if (open) { if (editReview) reset({ employeeId: editReview.employeeId, periodType: editReview.periodType, periodLabel: editReview.periodLabel, attendanceScore: editReview.attendanceScore, taskCompletionScore: editReview.taskCompletionScore, workQualityScore: editReview.workQualityScore, communicationScore: editReview.communicationScore, teamworkScore: editReview.teamworkScore, responsibilityScore: editReview.responsibilityScore, productivityScore: editReview.productivityScore, deadlineManagementScore: editReview.deadlineManagementScore, feedback: editReview.feedback ?? "" }); else reset(); }
  }, [open, editReview, reset]);
  const onSubmit = async (values: FormValues) => {
    try {
      if (isEdit && editReview) { await updateReview({ reviewId: editReview._id, attendanceScore: values.attendanceScore, taskCompletionScore: values.taskCompletionScore, workQualityScore: values.workQualityScore, communicationScore: values.communicationScore, teamworkScore: values.teamworkScore, responsibilityScore: values.responsibilityScore, productivityScore: values.productivityScore, deadlineManagementScore: values.deadlineManagementScore, feedback: values.feedback || undefined }); toast.success("Review updated"); }
      else { await createReview({ employeeId: values.employeeId as Id<"employees">, periodType: values.periodType, periodLabel: values.periodLabel, attendanceScore: values.attendanceScore, taskCompletionScore: values.taskCompletionScore, workQualityScore: values.workQualityScore, communicationScore: values.communicationScore, teamworkScore: values.teamworkScore, responsibilityScore: values.responsibilityScore, productivityScore: values.productivityScore, deadlineManagementScore: values.deadlineManagementScore, feedback: values.feedback || undefined }); toast.success("Review submitted"); }
      onOpenChange(false);
    } catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to save review"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Review" : "New Performance Review"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {!isEdit && (<div className="flex flex-col gap-1.5"><Label>Employee</Label><Controller name="employeeId" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{(employees ?? []).map((e) => <SelectItem key={e._id} value={e._id}><div className="flex items-center gap-2"><Avatar className="size-5"><AvatarImage src={e.photoUrl ?? undefined} /><AvatarFallback className="text-[10px]">{e.fullName.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>{e.fullName}</div></SelectItem>)}</SelectContent></Select>)} />{errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}</div>)}
            <div className="flex flex-col gap-1.5"><Label>Period Type</Label><Controller name="periodType" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange} disabled={isEdit}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select>)} /></div>
            <div className="flex flex-col gap-1.5"><Label>Period Label</Label><input {...register("periodLabel")} readOnly={!isEdit} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50" />{errors.periodLabel && <p className="text-xs text-destructive">{errors.periodLabel.message}</p>}</div>
          </div>
          <div className="rounded-lg border p-4 flex flex-col gap-5">
            <p className="text-sm font-medium text-muted-foreground">Performance Scores (1 = Poor, 5 = Excellent)</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {SCORE_FIELDS.map(({ key, label }) => (
                <Controller key={key} name={key} control={control} render={({ field }) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between"><Label className="text-sm">{label}</Label><span className="text-xs font-semibold text-primary">{field.value} \u2014 {SCORE_LABELS[field.value as number] ?? ""}</span></div>
                    <Slider min={1} max={5} step={1} value={[field.value as number]} onValueChange={([v]) => field.onChange(v)} className="cursor-pointer" />
                  </div>
                )} />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5"><Label>Written Feedback (optional)</Label><Textarea {...register("feedback")} rows={3} placeholder="Provide constructive feedback for this employee\u2026" /></div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving\u2026" : isEdit ? "Update Review" : "Submit Review"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

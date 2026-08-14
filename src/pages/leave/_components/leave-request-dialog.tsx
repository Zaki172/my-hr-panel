import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { differenceInBusinessDays, addDays } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

const schema = z.object({ leaveType: z.enum(["annual", "sick", "casual", "emergency", "unpaid"]), startDate: z.string().min(1, "Start date required"), endDate: z.string().min(1, "End date required"), reason: z.string().min(5, "Please provide a reason (min 5 characters)"), emergencyContact: z.string().optional() }).refine((d) => d.endDate >= d.startDate, { message: "End date must be on or after start date", path: ["endDate"] });
type FormValues = z.infer<typeof schema>;
const LEAVE_TYPE_LABELS: Record<string, string> = { annual: "Annual Leave", sick: "Sick Leave", casual: "Casual Leave", emergency: "Emergency Leave", unpaid: "Unpaid Leave" };

export function LeaveRequestDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const submitRequest = useMutation(api.leave.submit);
  const { register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues, unknown, FormValues>({ resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>, defaultValues: { leaveType: "annual", startDate: "", endDate: "", reason: "", emergencyContact: "" } });
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const numberOfDays = startDate && endDate && endDate >= startDate ? Math.max(1, differenceInBusinessDays(addDays(new Date(endDate), 1), new Date(startDate))) : 0;
  useEffect(() => { if (open) reset(); }, [open, reset]);
  const onSubmit = async (values: FormValues) => {
    try { await submitRequest({ leaveType: values.leaveType, startDate: values.startDate, endDate: values.endDate, numberOfDays, reason: values.reason, emergencyContact: values.emergencyContact || undefined }); toast.success("Leave request submitted"); onOpenChange(false); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to submit request"); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5"><Label>Leave Type</Label><Controller name="leaveType" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(LEAVE_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5"><Label>Start Date</Label><Input type="date" {...register("startDate")} />{errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message}</p>}</div>
            <div className="flex flex-col gap-1.5"><Label>End Date</Label><Input type="date" {...register("endDate")} />{errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message}</p>}</div>
          </div>
          {numberOfDays > 0 && <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">{numberOfDays} working day{numberOfDays !== 1 ? "s" : ""}</p>}
          <div className="flex flex-col gap-1.5"><Label>Reason</Label><Textarea {...register("reason")} placeholder="Please describe the reason for your leave\u2026" rows={3} />{errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}</div>
          <div className="flex flex-col gap-1.5"><Label>Emergency Contact (optional)</Label><Input {...register("emergencyContact")} placeholder="Name and phone number" /></div>
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting\u2026" : "Submit Request"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

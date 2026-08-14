import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { format } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

const STATUSES = ["present", "absent", "late", "remote", "leave", "half_day"] as const;
const WORK_MODES = ["office", "remote", "hybrid"] as const;
const schema = z.object({ status: z.enum(STATUSES), workMode: z.enum(WORK_MODES), checkInAt: z.string().optional(), checkOutAt: z.string().optional() });
type FormValues = z.infer<typeof schema>;
const STATUS_OPTIONS = [{ value: "present", label: "Present" }, { value: "late", label: "Late" }, { value: "remote", label: "Remote" }, { value: "absent", label: "Absent" }, { value: "leave", label: "On Leave" }, { value: "half_day", label: "Half Day" }];
const WORK_MODE_OPTIONS = [{ value: "office", label: "Office" }, { value: "remote", label: "Remote" }, { value: "hybrid", label: "Hybrid" }];

export type AttendanceMarkRow = { employee: { _id: Id<"employees">; fullName: string; employeeCode: string }; record: { _id: Id<"attendance">; status: string; workMode: string; checkInAt?: string; checkOutAt?: string; [key: string]: unknown } | null };

function toIso(date: string, time: string): string { return new Date(`${date}T${time}:00`).toISOString(); }
function toLocalTime(iso: string): string { return new Date(iso).toTimeString().slice(0, 5); }
function isValidStatus(s: string): s is FormValues["status"] { return (STATUSES as readonly string[]).includes(s); }
function isValidWorkMode(s: string): s is FormValues["workMode"] { return (WORK_MODES as readonly string[]).includes(s); }

export function MarkAttendanceDialog({ row, date, open, onOpenChange }: { row: AttendanceMarkRow | null; date: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const mark = useMutation(api.attendance.markAttendance);
  const [saving, setSaving] = useState(false);
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { status: "present", workMode: "office", checkInAt: "09:00", checkOutAt: "18:00" } });
  useEffect(() => {
    if (row?.record) { const status = isValidStatus(row.record.status) ? row.record.status : "present"; const workMode = isValidWorkMode(row.record.workMode) ? row.record.workMode : "office"; form.reset({ status, workMode, checkInAt: row.record.checkInAt ? toLocalTime(row.record.checkInAt) : "", checkOutAt: row.record.checkOutAt ? toLocalTime(row.record.checkOutAt) : "" }); }
    else { form.reset({ status: "present", workMode: "office", checkInAt: "09:00", checkOutAt: "18:00" }); }
  }, [row, form]);
  async function onSubmit(values: FormValues) {
    if (!row) return;
    setSaving(true);
    try { await mark({ employeeId: row.employee._id, date, status: values.status, workMode: values.workMode, checkInAt: values.checkInAt ? toIso(date, values.checkInAt) : undefined, checkOutAt: values.checkOutAt ? toIso(date, values.checkOutAt) : undefined }); toast.success(`Attendance marked for ${row.employee.fullName}`); onOpenChange(false); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to save attendance"); }
    finally { setSaving(false); }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Mark Attendance \u2014 {row?.employee.fullName}</DialogTitle><p className="text-sm text-muted-foreground">{format(new Date(date + "T00:00:00"), "EEEE, d MMMM yyyy")}</p></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger></FormControl><SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="workMode" render={({ field }) => (<FormItem><FormLabel>Work Mode</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="cursor-pointer"><SelectValue /></SelectTrigger></FormControl><SelectContent>{WORK_MODE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="checkInAt" render={({ field }) => (<FormItem><FormLabel>Check-in</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="checkOutAt" render={({ field }) => (<FormItem><FormLabel>Check-out</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <DialogFooter><Button type="button" variant="secondary" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="cursor-pointer" disabled={saving}>{saving ? "Saving\u2026" : "Save"}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

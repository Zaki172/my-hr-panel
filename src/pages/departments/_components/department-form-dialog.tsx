import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

const schema = z.object({ companyId: z.string().min(1, "Company is required"), name: z.string().min(1, "Name is required").max(100), description: z.string().max(500).optional(), headEmployeeId: z.string().optional() });
type FormValues = z.infer<typeof schema>;
type Props = { open: boolean; onOpenChange: (open: boolean) => void; department?: (Doc<"departments"> & { employeeCount?: number; headName?: string | null; companyName?: string | null }) | null };
const NONE = "none";

export function DepartmentFormDialog({ open, onOpenChange, department }: Props) {
  const companies = useQuery(api.companies.list, {});
  const isEdit = !!department;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { companyId: department?.companyId ?? "", name: department?.name ?? "", description: department?.description ?? "", headEmployeeId: department?.headEmployeeId ?? NONE },
  });
  const watchedCompany = form.watch("companyId");
  const employees = useQuery(api.employees.list, watchedCompany ? { companyId: watchedCompany as Doc<"companies">["_id"] } : "skip");
  const createDept = useMutation(api.departments.create);
  const updateDept = useMutation(api.departments.update);
  const [saving, setSaving] = useState(false);

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      const headEmployeeId = values.headEmployeeId && values.headEmployeeId !== NONE ? (values.headEmployeeId as Doc<"employees">["_id"]) : undefined;
      if (isEdit && department) { await updateDept({ departmentId: department._id, name: values.name, description: values.description || undefined, headEmployeeId }); toast.success("Department updated"); }
      else { await createDept({ companyId: values.companyId as Doc<"companies">["_id"], name: values.name, description: values.description || undefined, headEmployeeId }); toast.success("Department created"); }
      onOpenChange(false); form.reset();
    } catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Something went wrong"); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Department" : "Add Department"}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField control={form.control} name="companyId" render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><Select value={field.value} onValueChange={(v) => { field.onChange(v); form.setValue("headEmployeeId", NONE); }} disabled={isEdit}><FormControl><SelectTrigger className="cursor-pointer"><SelectValue placeholder="Select company" /></SelectTrigger></FormControl><SelectContent>{companies?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Department Name</FormLabel><FormControl><Input placeholder="e.g. Software Development" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Textarea placeholder="Brief description of the department's role\u2026" rows={3} {...field} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="headEmployeeId" render={({ field }) => (<FormItem><FormLabel>Department Head (optional)</FormLabel><Select value={field.value ?? NONE} onValueChange={field.onChange}><FormControl><SelectTrigger className="cursor-pointer"><SelectValue placeholder="No head assigned" /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE}>No head assigned</SelectItem>{employees?.map((e) => <SelectItem key={e._id} value={e._id}>{e.fullName} \u2014 {e.position}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            <DialogFooter><Button type="button" variant="secondary" className="cursor-pointer" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" className="cursor-pointer" disabled={saving}>{saving ? "Saving\u2026" : isEdit ? "Save Changes" : "Create Department"}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

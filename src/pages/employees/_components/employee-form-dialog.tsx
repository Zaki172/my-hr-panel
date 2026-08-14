import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useConvex } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Camera } from "lucide-react";
import { EMPLOYMENT_TYPE_LABELS, WORK_MODE_LABELS, EMPLOYEE_STATUS_LABELS, GENDER_LABELS, toOptions } from "../_lib/labels.ts";

const employeeFormSchema = z.object({
  employeeCode: z.string().trim().min(1, "Required"), fullName: z.string().trim().min(1, "Required"), email: z.string().trim().email("Enter a valid email"), phone: z.string().trim().optional(), dateOfBirth: z.string().trim().optional(), gender: z.string().trim().optional(), address: z.string().trim().optional(), emergencyContactName: z.string().trim().optional(), emergencyContactPhone: z.string().trim().optional(), companyId: z.string().trim().min(1, "Required"), departmentId: z.string().trim().min(1, "Required"), position: z.string().trim().min(1, "Required"), employmentType: z.string().trim().min(1, "Required"), joiningDate: z.string().trim().min(1, "Required"), reportingManagerId: z.string().trim().optional(), officeLocation: z.string().trim().min(1, "Required"), workMode: z.string().trim().min(1, "Required"), status: z.string().trim().min(1, "Required"),
});
type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
const NONE_VALUE = "none";

function toFormValues(employee: Doc<"employees"> | null): EmployeeFormValues {
  return { employeeCode: employee?.employeeCode ?? "", fullName: employee?.fullName ?? "", email: employee?.email ?? "", phone: employee?.phone ?? "", dateOfBirth: employee?.dateOfBirth ?? "", gender: employee?.gender ?? "", address: employee?.address ?? "", emergencyContactName: employee?.emergencyContactName ?? "", emergencyContactPhone: employee?.emergencyContactPhone ?? "", companyId: employee?.companyId ?? "", departmentId: employee?.departmentId ?? "", position: employee?.position ?? "", employmentType: employee?.employmentType ?? "", joiningDate: employee?.joiningDate ?? "", reportingManagerId: employee?.reportingManagerId ?? "", officeLocation: employee?.officeLocation ?? "", workMode: employee?.workMode ?? "", status: employee?.status ?? "active" };
}

export function EmployeeFormDialog({ open, onOpenChange, employee }: { open: boolean; onOpenChange: (open: boolean) => void; employee: Doc<"employees"> | null }) {
  const isEditing = employee !== null;
  const companies = useQuery(api.companies.list, {});
  const allDepartments = useQuery(api.departments.list, {});
  const allEmployees = useQuery(api.employees.list, {});
  const createEmployee = useMutation(api.employees.create);
  const updateEmployee = useMutation(api.employees.update);
  const generateUploadUrl = useMutation(api.employees.generateUploadUrl);
  const convex = useConvex();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | undefined>(employee?.photoUrl);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const form = useForm<EmployeeFormValues>({ resolver: zodResolver(employeeFormSchema), defaultValues: toFormValues(employee) });
  useEffect(() => { if (open) { form.reset(toFormValues(employee)); setUploadedPhotoUrl(null); setPhotoPreviewUrl(employee?.photoUrl); } }, [open, employee]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedCompanyId = form.watch("companyId");
  const departmentsForCompany = useMemo(() => allDepartments?.filter((d) => d.companyId === selectedCompanyId) ?? [], [allDepartments, selectedCompanyId]);
  const managersForCompany = useMemo(() => allEmployees?.filter((e) => e.companyId === selectedCompanyId && e._id !== employee?._id) ?? [], [allEmployees, selectedCompanyId, employee]);

  async function handlePhotoChange(file: File) {
    setIsUploadingPhoto(true);
    try { const uploadUrl = await generateUploadUrl(); const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file }); const { storageId } = (await result.json()) as { storageId: Id<"_storage"> }; const url = await convex.query(api.employees.getUploadedFileUrl, { storageId }); if (url) { setUploadedPhotoUrl(url); setPhotoPreviewUrl(url); } }
    catch { toast.error("Failed to upload photo"); }
    finally { setIsUploadingPhoto(false); }
  }

  async function onSubmit(values: EmployeeFormValues) {
    setIsSubmitting(true);
    try {
      const payload = { employeeCode: values.employeeCode, fullName: values.fullName, email: values.email, phone: values.phone || undefined, dateOfBirth: values.dateOfBirth || undefined, gender: values.gender && values.gender !== NONE_VALUE ? (values.gender as "male" | "female" | "other") : undefined, address: values.address || undefined, emergencyContactName: values.emergencyContactName || undefined, emergencyContactPhone: values.emergencyContactPhone || undefined, companyId: values.companyId as Id<"companies">, departmentId: values.departmentId as Id<"departments">, position: values.position, employmentType: values.employmentType as "full_time" | "part_time" | "intern" | "contract" | "remote", joiningDate: values.joiningDate, reportingManagerId: values.reportingManagerId && values.reportingManagerId !== NONE_VALUE ? (values.reportingManagerId as Id<"employees">) : undefined, officeLocation: values.officeLocation, workMode: values.workMode as "office" | "remote" | "hybrid", status: values.status as "active" | "on_leave" | "probation" | "resigned" | "terminated", photoUrl: uploadedPhotoUrl ?? employee?.photoUrl };
      if (isEditing) { await updateEmployee({ employeeId: employee._id, ...payload }); toast.success("Employee updated"); }
      else { await createEmployee(payload); toast.success("Employee added"); }
      onOpenChange(false);
    } catch (error) { if (error instanceof ConvexError) { const data = error.data as { message?: string }; toast.error(data.message ?? "Something went wrong"); } else toast.error("Something went wrong"); }
    finally { setIsSubmitting(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          <DialogDescription>{isEditing ? "Update this employee's personal and employment details." : "Create a new employee profile. They'll be linked automatically once they sign in with this email."}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar size="lg"><AvatarImage src={photoPreviewUrl} /><AvatarFallback>{(form.watch("fullName") || "?").charAt(0).toUpperCase()}</AvatarFallback></Avatar>
              <label className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                {isUploadingPhoto ? <Spinner className="size-4" /> : <Camera className="size-4" />}Upload photo
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void handlePhotoChange(file); }} />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="employeeCode" render={({ field }) => (<FormItem><FormLabel>Employee ID</FormLabel><FormControl><Input placeholder="NAK-007" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="fullName" render={({ field }) => (<FormItem><FormLabel>Full name</FormLabel><FormControl><Input placeholder="John Smith" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input placeholder="+880171000000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="dateOfBirth" render={({ field }) => (<FormItem><FormLabel>Date of birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="gender" render={({ field }) => (<FormItem><FormLabel>Gender</FormLabel><Select value={field.value || NONE_VALUE} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE_VALUE}>Not specified</SelectItem>{toOptions(GENDER_LABELS).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Textarea placeholder="Street, city, country" {...field} /></FormControl><FormMessage /></FormItem>)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="emergencyContactName" render={({ field }) => (<FormItem><FormLabel>Emergency contact name</FormLabel><FormControl><Input placeholder="Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (<FormItem><FormLabel>Emergency contact phone</FormLabel><FormControl><Input placeholder="+880171000000" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="companyId" render={({ field }) => (<FormItem><FormLabel>Company</FormLabel><Select value={field.value} onValueChange={(value) => { field.onChange(value); form.setValue("departmentId", ""); form.setValue("reportingManagerId", ""); }}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select company" /></SelectTrigger></FormControl><SelectContent>{companies?.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="departmentId" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Select value={field.value} onValueChange={field.onChange} disabled={!selectedCompanyId}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select department" /></SelectTrigger></FormControl><SelectContent>{departmentsForCompany.map((d) => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="position" render={({ field }) => (<FormItem><FormLabel>Job title / position</FormLabel><FormControl><Input placeholder="Travel Consultant" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="employmentType" render={({ field }) => (<FormItem><FormLabel>Employment type</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent>{toOptions(EMPLOYMENT_TYPE_LABELS).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="joiningDate" render={({ field }) => (<FormItem><FormLabel>Joining date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="reportingManagerId" render={({ field }) => (<FormItem><FormLabel>Reporting manager</FormLabel><Select value={field.value || NONE_VALUE} onValueChange={field.onChange} disabled={!selectedCompanyId}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select manager" /></SelectTrigger></FormControl><SelectContent><SelectItem value={NONE_VALUE}>None</SelectItem>{managersForCompany.map((m) => <SelectItem key={m._id} value={m._id}>{m.fullName}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="officeLocation" render={({ field }) => (<FormItem><FormLabel>Office location</FormLabel><FormControl><Input placeholder="Tokyo, Japan" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="workMode" render={({ field }) => (<FormItem><FormLabel>Work mode</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select mode" /></SelectTrigger></FormControl><SelectContent>{toOptions(WORK_MODE_LABELS).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select value={field.value} onValueChange={field.onChange}><FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger></FormControl><SelectContent>{toOptions(EMPLOYEE_STATUS_LABELS).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} className="cursor-pointer">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="cursor-pointer">{isSubmitting && <Spinner className="size-4" />}{isEditing ? "Save changes" : "Add employee"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

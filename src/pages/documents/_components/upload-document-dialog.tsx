import { useRef, useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Upload, X, FileText } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { CATEGORY_LABELS } from "./doc-utils.ts";

const schema = z.object({ employeeId: z.string().min(1, "Select an employee"), category: z.string().min(1, "Select a category"), isConfidential: z.boolean() });
type FormValues = z.infer<typeof schema>;

export function UploadDocumentDialog({ open, onOpenChange, companyId, preselectedEmployeeId, isManager }: { open: boolean; onOpenChange: (open: boolean) => void; companyId?: Id<"companies">; preselectedEmployeeId?: Id<"employees">; isManager: boolean }) {
  const employees = useQuery(api.employees.list, open && isManager ? { companyId } : "skip");
  const me = useQuery(api.me.getMe, {});
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl);
  const saveDocument = useMutation(api.documents.save);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { handleSubmit, control, reset, formState: { errors } } = useForm<FormValues, unknown, FormValues>({ resolver: zodResolver(schema) as import("react-hook-form").Resolver<FormValues>, defaultValues: { employeeId: preselectedEmployeeId ?? me?.employee?._id ?? "", category: "other", isConfidential: false } });
  useEffect(() => { if (open) { reset({ employeeId: preselectedEmployeeId ?? me?.employee?._id ?? "", category: "other", isConfidential: false }); setSelectedFile(null); } }, [open, preselectedEmployeeId, me?.employee?._id, reset]);
  const onSubmit = async (values: FormValues) => {
    if (!selectedFile) { toast.error("Please select a file to upload"); return; }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": selectedFile.type }, body: selectedFile });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      await saveDocument({ employeeId: values.employeeId as Id<"employees">, category: values.category as Parameters<typeof saveDocument>[0]["category"], fileName: selectedFile.name, fileId: storageId, isConfidential: values.isConfidential });
      toast.success("Document uploaded successfully"); onOpenChange(false);
    } catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Upload failed. Please try again."); }
    finally { setUploading(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {isManager && (<div className="flex flex-col gap-1.5"><Label>Employee</Label><Controller name="employeeId" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange} disabled={!!preselectedEmployeeId}><SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{(employees ?? []).map((e) => <SelectItem key={e._id} value={e._id}>{e.fullName}</SelectItem>)}</SelectContent></Select>)} />{errors.employeeId && <p className="text-xs text-destructive">{errors.employeeId.message}</p>}</div>)}
          <div className="flex flex-col gap-1.5"><Label>Category</Label><Controller name="category" control={control} render={({ field }) => (<Select value={field.value} onValueChange={field.onChange}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{Object.entries(CATEGORY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>)} /></div>
          <div className="flex flex-col gap-1.5"><Label>File</Label><div className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-6 transition-colors hover:border-primary/60 hover:bg-muted/30" onClick={() => fileInputRef.current?.click()}>{selectedFile ? (<div className="flex items-center gap-2 text-sm"><FileText className="size-5 text-primary" /><span className="max-w-[200px] truncate font-medium">{selectedFile.name}</span><button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button></div>) : (<><Upload className="size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click to select a file</p><p className="text-xs text-muted-foreground">PDF, Word, Excel, Images, etc.</p></>)}</div><input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setSelectedFile(file); }} /></div>
          {isManager && (<Controller name="isConfidential" control={control} render={({ field }) => (<div className="flex items-center gap-2"><Checkbox id="confidential" checked={field.value} onCheckedChange={field.onChange} /><Label htmlFor="confidential" className="cursor-pointer text-sm font-normal">Mark as confidential (only HR/Admin can view)</Label></div>)} />)}
          <DialogFooter><Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={uploading || !selectedFile}>{uploading ? "Uploading\u2026" : "Upload"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

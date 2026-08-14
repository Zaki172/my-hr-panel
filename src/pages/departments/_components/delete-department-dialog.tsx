import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.tsx";

type Props = { department: (Doc<"departments"> & { employeeCount?: number }) | null; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void };

export function DeleteDepartmentDialog({ department, open, onOpenChange, onDeleted }: Props) {
  const remove = useMutation(api.departments.remove);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!department) return;
    setLoading(true);
    try { await remove({ departmentId: department._id }); toast.success("Department deleted"); onOpenChange(false); onDeleted?.(); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to delete department"); }
    finally { setLoading(false); }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {department?.name}?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone. The department will be permanently removed. You must reassign all employees before deleting.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete} disabled={loading}>{loading ? "Deleting\u2026" : "Delete Department"}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

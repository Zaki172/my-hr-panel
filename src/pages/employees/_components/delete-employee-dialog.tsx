import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.tsx";

export function DeleteEmployeeDialog({ employee, open, onOpenChange, onDeleted }: { employee: Doc<"employees"> | null; open: boolean; onOpenChange: (open: boolean) => void; onDeleted?: () => void }) {
  const removeEmployee = useMutation(api.employees.remove);
  async function handleDelete() {
    if (!employee) return;
    try { await removeEmployee({ employeeId: employee._id }); toast.success("Employee removed"); onDeleted?.(); }
    catch (error) { if (error instanceof ConvexError) { const data = error.data as { message?: string }; toast.error(data.message ?? "Failed to remove employee"); } else toast.error("Failed to remove employee"); }
  }
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {employee?.fullName}?</AlertDialogTitle>
          <AlertDialogDescription>This permanently deletes their employee profile. This does not delete their sign-in account. This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
          <AlertDialogAction className="cursor-pointer bg-destructive text-white hover:bg-destructive/90" onClick={() => void handleDelete()}>Remove</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

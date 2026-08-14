import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog.tsx";

export function DeleteProjectDialog({ open, onOpenChange, projectId, projectName, onDeleted }: { open: boolean; onOpenChange: (open: boolean) => void; projectId: Id<"projects"> | null; projectName: string; onDeleted?: () => void }) {
  const removeProject = useMutation(api.projects.remove);
  const handleDelete = async () => {
    if (!projectId) return;
    try { await removeProject({ projectId }); toast.success("Project deleted"); onDeleted?.(); onOpenChange(false); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to delete project"); }
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Delete Project</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete <strong>{projectName}</strong>? This will permanently remove the project, all its tasks, and comments. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

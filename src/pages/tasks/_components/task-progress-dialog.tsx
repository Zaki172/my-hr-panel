import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Slider } from "@/components/ui/slider.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";

type Task = { _id: Id<"tasks">; name: string; projectId: Id<"projects">; companyId: Id<"companies">; assignedEmployeeId: Id<"employees">; description?: string; startDate: string; dueDate: string; priority: "low" | "medium" | "high" | "urgent"; status: "not_started" | "in_progress" | "review" | "completed" | "on_hold"; progress: number };

export function TaskProgressDialog({ open, onOpenChange, task }: { open: boolean; onOpenChange: (open: boolean) => void; task: Task }) {
  const updateTask = useMutation(api.projects.updateTask);
  const [status, setStatus] = useState<Task["status"]>(task.status);
  const [progress, setProgress] = useState(task.progress);
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try { await updateTask({ taskId: task._id, name: task.name, projectId: task.projectId, companyId: task.companyId, assignedEmployeeId: task.assignedEmployeeId, description: task.description, startDate: task.startDate, dueDate: task.dueDate, priority: task.priority, status, progress }); toast.success("Task updated"); onOpenChange(false); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to update task"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Update Task Progress</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-5 py-2">
          <p className="text-sm font-medium">{task.name}</p>
          <div className="flex flex-col gap-1.5"><Label>Status</Label><Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_started">Not Started</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="review">Review</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="on_hold">On Hold</SelectItem></SelectContent></Select></div>
          <div className="flex flex-col gap-2"><div className="flex items-center justify-between"><Label>Progress</Label><span className="text-sm font-semibold text-primary">{progress}%</span></div><Slider min={0} max={100} step={5} value={[progress]} onValueChange={([v]) => setProgress(v)} /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving\u2026" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

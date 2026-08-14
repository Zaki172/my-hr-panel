import { useMutation } from "convex/react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { useState } from "react";
import { format } from "date-fns";

type ScheduleStatus = "office" | "remote" | "day_off" | "leave" | "holiday" | "business_trip";
const STATUS_OPTIONS: { value: ScheduleStatus; label: string; color: string }[] = [{ value: "office", label: "Office", color: "bg-emerald-500" }, { value: "remote", label: "Remote", color: "bg-sky-500" }, { value: "day_off", label: "Day Off", color: "bg-slate-400" }, { value: "leave", label: "Leave", color: "bg-purple-500" }, { value: "holiday", label: "Holiday", color: "bg-amber-500" }, { value: "business_trip", label: "Business Trip", color: "bg-orange-500" }];

export function ScheduleCellDialog({ open, onOpenChange, employeeId, employeeName, date, currentStatus, currentNote }: { open: boolean; onOpenChange: (open: boolean) => void; employeeId: Id<"employees">; employeeName: string; date: string; currentStatus?: ScheduleStatus; currentNote?: string }) {
  const upsert = useMutation(api.schedule.upsert);
  const remove = useMutation(api.schedule.remove);
  const [selectedStatus, setSelectedStatus] = useState<ScheduleStatus>(currentStatus ?? "office");
  const [note, setNote] = useState(currentNote ?? "");
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    setSaving(true);
    try { await upsert({ employeeId, date, status: selectedStatus, note: note || undefined }); toast.success("Schedule updated"); onOpenChange(false); }
    catch (err) { if (err instanceof ConvexError) toast.error((err.data as { message: string }).message); else toast.error("Failed to update schedule"); }
    finally { setSaving(false); }
  };
  const handleClear = async () => {
    setSaving(true);
    try { await remove({ employeeId, date }); toast.success("Schedule entry cleared"); onOpenChange(false); }
    catch { toast.error("Failed to clear entry"); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Set Schedule</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1"><p className="font-medium text-sm">{employeeName}</p><p className="text-xs text-muted-foreground">{format(new Date(date + "T00:00:00"), "EEEE, MMMM d, yyyy")}</p></div>
          <div className="flex flex-col gap-1.5"><Label>Status</Label><div className="grid grid-cols-2 gap-2">{STATUS_OPTIONS.map((opt) => (<button key={opt.value} type="button" onClick={() => setSelectedStatus(opt.value)} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${selectedStatus === opt.value ? "border-primary bg-primary/10 font-medium" : "border-border hover:bg-muted"}`}><span className={`size-2.5 rounded-full ${opt.color}`} />{opt.label}</button>))}</div></div>
          <div className="flex flex-col gap-1.5"><Label>Note (optional)</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Client visit, team event\u2026" /></div>
        </div>
        <DialogFooter className="flex-row justify-between sm:justify-between">
          {currentStatus && <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving} className="text-muted-foreground">Clear</Button>}
          <div className="flex gap-2 ml-auto"><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving ? "Saving\u2026" : "Save"}</Button></div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
